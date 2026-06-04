using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Overtime;
using ServicePilot.Application.Interfaces.Repositories;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;
using ServicePilot.Domain.Entities;
using ServicePilot.Infrastructure.Persistence.Models;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Infrastructure.Services
{
    public class OvertimeService : IOvertimeService
    {
        private readonly IOvertimeRepository _repository;
        private readonly ICurrentUserService _currentUser;
        private readonly IAuthService _authorization;
        private readonly AppDbContext _context;

        private readonly INotificationService _notifications;

        public OvertimeService(
            IOvertimeRepository repository,
            ICurrentUserService currentUser,
            IAuthService authorization,
            AppDbContext context,
            INotificationService notifications)
        {
            _repository    = repository;
            _currentUser   = currentUser;
            _authorization = authorization;
            _context       = context;
            _notifications = notifications;
        }

        // ════════════════════════════════════════════════════════════════
        // CREATE
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<OvertimeRequestResponseDto>> CreateAsync(
            CreateOvertimeRequestDto dto)
        {
            var employee = await GetEmployeeForCurrentUserAsync();
            if (employee == null)
                return Fail<OvertimeRequestResponseDto>(
                    "No employee profile linked to this account.");

            // Prevent duplicate request for same date
            var hasDuplicate = await _repository.HasExistingRequestAsync(
                employee.Id, _currentUser.CompanyId, dto.RequestDate);

            if (hasDuplicate)
                return Fail<OvertimeRequestResponseDto>(
                    "You already have an overtime request for this date.");

            var request = new OvertimeRequest
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.CompanyId,
                EmployeeId = employee.Id,
                RequestDate = dto.RequestDate,
                HoursRequested = dto.HoursRequested,
                Reason = dto.Reason,
                Status = RequestStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddAsync(request);
            await _repository.SaveChangesAsync();

            // Notify HR / Admins — non-fatal: swallow so a notification failure
            // does not cause the saved request to appear as an error.
            try
            {
                await _notifications.NotifyCompanyAsync(
                    _currentUser.CompanyId,
                    title:   $"New Overtime Request — {employee.FullName}",
                    message: $"{employee.FullName} requested {dto.HoursRequested}h overtime on {dto.RequestDate:dd MMM yyyy}.",
                    type:    "overtime");
            }
            catch { /* swallow */ }

            // Post-save fetch — wrapped defensively so a transient query failure
            // never hides a successful save.
            try
            {
                var created = await _repository.GetByIdAsync(
                    request.Id, _currentUser.CompanyId);
                return Ok(MapToDto(created!));
            }
            catch
            {
                // The overtime request was persisted; reconstruct the response from
                // the objects already in memory so the client receives a 200.
                request.Employee = employee;
                return Ok(MapToDto(request));
            }
        }

        // ════════════════════════════════════════════════════════════════
        // GET BY ID
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<OvertimeRequestResponseDto>> GetByIdAsync(Guid id)
        {
            var request = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (request == null)
                return Fail<OvertimeRequestResponseDto>("Overtime request not found.");

            // Technician can only view their own
            if (_authorization.IsTechnician())
            {
                var employee = await GetEmployeeForCurrentUserAsync();
                if (employee == null || request.EmployeeId != employee.Id)
                    return Fail<OvertimeRequestResponseDto>("Access denied.");
            }

            // Supervisor can only view their branch
            if (_authorization.IsSupervisor())
            {
                var inBranch = await _context.Employees.AnyAsync(x =>
                    x.Id == request.EmployeeId &&
                    x.BranchId == _currentUser.BranchId);

                if (!inBranch)
                    return Fail<OvertimeRequestResponseDto>("Access denied.");
            }

            return Ok(MapToDto(request));
        }

        // ════════════════════════════════════════════════════════════════
        // PAGED LIST
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<PagedResult<OvertimeRequestResponseDto>>> GetPagedAsync(
            PagedOvertimeRequest filter)
        {
            if (_authorization.IsSupervisor())
            {
                var branchEmployeeIds = await _context.Employees
                    .Where(x =>
                        x.CompanyId == _currentUser.CompanyId &&
                        x.BranchId == _currentUser.BranchId)
                    .Select(x => x.Id)
                    .ToListAsync();

                if (filter.EmployeeId.HasValue &&
                    !branchEmployeeIds.Contains(filter.EmployeeId.Value))
                    return Fail<PagedResult<OvertimeRequestResponseDto>>("Access denied.");
            }

            var result = await _repository.GetPagedAsync(_currentUser.CompanyId, filter);

            return Ok(new PagedResult<OvertimeRequestResponseDto>
            {
                Items = result.Items.Select(MapToDto).ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize
            });
        }

        // ════════════════════════════════════════════════════════════════
        // MY REQUESTS
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<IEnumerable<OvertimeRequestResponseDto>>> GetMyRequestsAsync()
        {
            var employee = await GetEmployeeForCurrentUserAsync();
            if (employee == null)
                return Fail<IEnumerable<OvertimeRequestResponseDto>>(
                    "No employee profile linked to this account.");

            var requests = await _repository.GetByEmployeeAsync(
                employee.Id, _currentUser.CompanyId);

            return Ok(requests.Select(MapToDto));
        }

        // ════════════════════════════════════════════════════════════════
        // APPROVE / REJECT
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<OvertimeRequestResponseDto>> ApproveRejectAsync(
            Guid id, ApproveRejectOvertimeDto dto)
        {
            var request = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (request == null)
                return Fail<OvertimeRequestResponseDto>("Overtime request not found.");

            if (request.Status != RequestStatus.Pending)
                return Fail<OvertimeRequestResponseDto>(
                    $"Cannot action a request that is already {request.Status}.");

            if (_authorization.IsSupervisor())
            {
                var inBranch = await _context.Employees.AnyAsync(x =>
                    x.Id == request.EmployeeId &&
                    x.BranchId == _currentUser.BranchId);

                if (!inBranch)
                    return Fail<OvertimeRequestResponseDto>("Access denied.");
            }

            request.Status = dto.Status;
            request.ApprovedBy = _currentUser.UserId;
            request.ApprovedAt = DateTime.UtcNow;
            request.UpdatedAt = DateTime.UtcNow;

            _repository.Update(request);
            await _repository.SaveChangesAsync();

            // Notify the employee that their overtime request was actioned
            var employeeUserId = await _context.Users
                .AsNoTracking()
                .Where(u => u.EmployeeId == request.EmployeeId && u.CompanyId == _currentUser.CompanyId)
                .Select(u => (Guid?)u.Id)
                .FirstOrDefaultAsync();

            if (employeeUserId.HasValue)
            {
                bool approved = dto.Status == RequestStatus.Approved;
                await _notifications.NotifyUserAsync(
                    _currentUser.CompanyId,
                    employeeUserId.Value,
                    title:   approved ? "Overtime Request Approved" : "Overtime Request Rejected",
                    message: approved
                        ? $"Your overtime request for {request.RequestDate:dd MMM yyyy} ({request.HoursRequested}h) has been approved."
                        : $"Your overtime request for {request.RequestDate:dd MMM yyyy} was rejected." +
                          (string.IsNullOrWhiteSpace(dto.Reason) ? "" : $" Reason: {dto.Reason}"),
                    type: "overtime");
            }

            var updated = await _repository.GetByIdAsync(
                request.Id, _currentUser.CompanyId);
            return Ok(MapToDto(updated!));
        }

        // ════════════════════════════════════════════════════════════════
        // CANCEL
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<OvertimeRequestResponseDto>> CancelAsync(Guid id)
        {
            var request = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (request == null)
                return Fail<OvertimeRequestResponseDto>("Overtime request not found.");

            var employee = await GetEmployeeForCurrentUserAsync();
            if (employee == null || request.EmployeeId != employee.Id)
            {
                if (!_authorization.IsAdmin() && !_authorization.IsHRManager())
                    return Fail<OvertimeRequestResponseDto>("Access denied.");
            }

            if (RequestStatus.IsTerminal(request.Status))
                return Fail<OvertimeRequestResponseDto>(
                    $"Cannot cancel a request that is already {request.Status}.");

            request.Status = RequestStatus.Cancelled;
            request.UpdatedAt = DateTime.UtcNow;

            _repository.Update(request);
            await _repository.SaveChangesAsync();

            var updated = await _repository.GetByIdAsync(
                request.Id, _currentUser.CompanyId);
            return Ok(MapToDto(updated!));
        }

        // ════════════════════════════════════════════════════════════════
        // HELPERS
        // ════════════════════════════════════════════════════════════════

        private async Task<Employee?> GetEmployeeForCurrentUserAsync()
        {
            return await _context.Users
                .AsNoTracking()
                .Include(x => x.Employee)
                .Where(x =>
                    x.Id == _currentUser.UserId &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive)
                .Select(x => x.Employee)
                .FirstOrDefaultAsync();
        }

        private static OvertimeRequestResponseDto MapToDto(OvertimeRequest r)
        {
            // Hourly rate = BasicSalary / 30 working days / 8 hours per day
            decimal? ratePerHour = null;
            decimal? totalAmount = null;

            if (r.Employee?.BasicSalary is decimal salary && salary > 0)
            {
                ratePerHour = Math.Round(salary / 30 / 8, 2);
                totalAmount = Math.Round(ratePerHour.Value * r.HoursRequested, 2);
            }

            return new OvertimeRequestResponseDto
            {
                Id = r.Id,
                EmployeeId = r.EmployeeId,
                EmployeeName = r.Employee?.FullName ?? string.Empty,
                EmployeeCode = r.Employee?.EmployeeCode ?? string.Empty,
                RequestDate = r.RequestDate,
                HoursRequested = r.HoursRequested,
                Reason = r.Reason,
                Status = r.Status,
                ApprovedBy = r.ApprovedBy,
                ApprovedByName = r.ApprovedByNavigation?.FullName,
                ApprovedAt = r.ApprovedAt,
                CreatedAt = r.CreatedAt,
                OvertimeRatePerHour = ratePerHour,
                TotalAmount = totalAmount
            };
        }

        private static ApiResponse<T> Ok<T>(T data) => new()
        { Success = true, Data = data, Message = string.Empty, Errors = null };

        private static ApiResponse<T> Fail<T>(string message) => new()
        { Success = false, Data = default, Message = message, Errors = null };
    }
}
