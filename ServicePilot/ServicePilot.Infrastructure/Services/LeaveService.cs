using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Leave;
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
    public class LeaveService : ILeaveService
    {
        private readonly ILeaveRepository _repository;
        private readonly ICurrentUserService _currentUser;
        private readonly IAuthService _authorization;
        private readonly AppDbContext _context;
        private readonly INotificationService _notifications;

        public LeaveService(
            ILeaveRepository repository,
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
        // CREATE — Technician/Supervisor submits a leave request
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<LeaveRequestResponseDto>> CreateAsync(
            CreateLeaveRequestDto dto)
        {
            // Resolve employee linked to current user
            var employee = await GetEmployeeForCurrentUserAsync();
            if (employee == null)
                return Fail<LeaveRequestResponseDto>(
                    "No employee profile linked to this account.");

            // Validate leave type belongs to company and is active
            var leaveType = await _repository.GetLeaveTypeAsync(
                dto.LeaveTypeId, _currentUser.CompanyId);

            if (leaveType == null)
                return Fail<LeaveRequestResponseDto>(
                    "Invalid or inactive leave type.");

            // Check for overlapping leave requests
            var hasOverlap = await _repository.HasOverlappingLeaveAsync(
                employee.Id, _currentUser.CompanyId,
                dto.StartDate, dto.EndDate);

            if (hasOverlap)
                return Fail<LeaveRequestResponseDto>(
                    "You already have an approved or pending leave request for these dates.");

            // Check max days per year for this leave type
            var totalDays = dto.EndDate.DayNumber - dto.StartDate.DayNumber + 1;
            var approvedDays = await _repository.GetApprovedDaysAsync(
                employee.Id, dto.LeaveTypeId, dto.StartDate.Year);

            if (approvedDays + totalDays > leaveType.MaxDaysPerYear)
                return Fail<LeaveRequestResponseDto>(
                    $"This request would exceed your annual limit of {leaveType.MaxDaysPerYear} days " +
                    $"for {leaveType.Name}. You have {leaveType.MaxDaysPerYear - approvedDays} days remaining.");

            var request = new LeaveRequest
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.CompanyId,
                EmployeeId = employee.Id,
                LeaveTypeId = dto.LeaveTypeId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Reason = dto.Reason,
                Status = RequestStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddAsync(request);
            await _repository.SaveChangesAsync();

            // Notify HR / Admins that a new leave request needs review
            await _notifications.NotifyCompanyAsync(
                _currentUser.CompanyId,
                title:   $"New Leave Request — {employee.FullName}",
                message: $"{employee.FullName} submitted a {leaveType.Name} request " +
                         $"({request.StartDate:dd MMM} – {request.EndDate:dd MMM yyyy}).",
                type:    "leave");

            var created = await _repository.GetByIdAsync(request.Id, _currentUser.CompanyId);
            return Ok(MapToDto(created!));
        }

        // ════════════════════════════════════════════════════════════════
        // GET BY ID
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<LeaveRequestResponseDto>> GetByIdAsync(Guid id)
        {
            var request = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (request == null)
                return Fail<LeaveRequestResponseDto>("Leave request not found.");

            // Technician can only view their own requests
            if (_authorization.IsTechnician())
            {
                var employee = await GetEmployeeForCurrentUserAsync();
                if (employee == null || request.EmployeeId != employee.Id)
                    return Fail<LeaveRequestResponseDto>("Access denied.");
            }

            // Supervisor can only view requests from their branch
            if (_authorization.IsSupervisor())
            {
                var inBranch = await _context.Employees.AnyAsync(x =>
                    x.Id == request.EmployeeId &&
                    x.BranchId == _currentUser.BranchId);

                if (!inBranch)
                    return Fail<LeaveRequestResponseDto>("Access denied.");
            }

            return Ok(MapToDto(request));
        }

        // ════════════════════════════════════════════════════════════════
        // PAGED LIST — Admin / HR Manager / Supervisor
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<PagedResult<LeaveRequestResponseDto>>> GetPagedAsync(
            PagedLeaveRequest filter)
        {
            // Supervisor locked to their branch employees
            if (_authorization.IsSupervisor())
            {
                var branchEmployeeIds = await _context.Employees
                    .Where(x =>
                        x.CompanyId == _currentUser.CompanyId &&
                        x.BranchId == _currentUser.BranchId)
                    .Select(x => x.Id)
                    .ToListAsync();

                // If a specific employee is requested, verify they're in the branch
                if (filter.EmployeeId.HasValue &&
                    !branchEmployeeIds.Contains(filter.EmployeeId.Value))
                    return Fail<PagedResult<LeaveRequestResponseDto>>("Access denied.");
            }

            var result = await _repository.GetPagedAsync(_currentUser.CompanyId, filter);

            return Ok(new PagedResult<LeaveRequestResponseDto>
            {
                Items = result.Items.Select(MapToDto).ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize
            });
        }

        // ════════════════════════════════════════════════════════════════
        // MY REQUESTS — for mobile app
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<IEnumerable<LeaveRequestResponseDto>>> GetMyRequestsAsync()
        {
            var employee = await GetEmployeeForCurrentUserAsync();
            if (employee == null)
                return Fail<IEnumerable<LeaveRequestResponseDto>>(
                    "No employee profile linked to this account.");

            var requests = await _repository.GetByEmployeeAsync(
                employee.Id, _currentUser.CompanyId);

            return Ok(requests.Select(MapToDto));
        }

        // ════════════════════════════════════════════════════════════════
        // APPROVE / REJECT — Admin / HR Manager / Supervisor
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<LeaveRequestResponseDto>> ApproveRejectAsync(
            Guid id, ApproveRejectLeaveDto dto)
        {
            var request = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (request == null)
                return Fail<LeaveRequestResponseDto>("Leave request not found.");

            if (request.Status != RequestStatus.Pending)
                return Fail<LeaveRequestResponseDto>(
                    $"Cannot action a request that is already {request.Status}.");

            // Supervisor can only approve/reject their branch employees
            if (_authorization.IsSupervisor())
            {
                var inBranch = await _context.Employees.AnyAsync(x =>
                    x.Id == request.EmployeeId &&
                    x.BranchId == _currentUser.BranchId);

                if (!inBranch)
                    return Fail<LeaveRequestResponseDto>("Access denied.");
            }

            request.Status = dto.Status;
            request.ApprovedBy = _currentUser.UserId;
            request.ApprovedAt = DateTime.UtcNow;
            request.UpdatedAt = DateTime.UtcNow;

            _repository.Update(request);
            await _repository.SaveChangesAsync();

            // Notify the employee that their request was actioned
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
                    title:   approved ? "Leave Request Approved" : "Leave Request Rejected",
                    message: approved
                        ? $"Your leave request ({request.StartDate:dd MMM} – {request.EndDate:dd MMM yyyy}) has been approved."
                        : $"Your leave request ({request.StartDate:dd MMM} – {request.EndDate:dd MMM yyyy}) was rejected." +
                          (string.IsNullOrWhiteSpace(dto.Reason) ? "" : $" Reason: {dto.Reason}"),
                    type: "leave");
            }

            var updated = await _repository.GetByIdAsync(request.Id, _currentUser.CompanyId);
            return Ok(MapToDto(updated!));
        }

        // ════════════════════════════════════════════════════════════════
        // CANCEL — employee cancels their own pending request
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<LeaveRequestResponseDto>> CancelAsync(Guid id)
        {
            var request = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (request == null)
                return Fail<LeaveRequestResponseDto>("Leave request not found.");

            // Verify ownership
            var employee = await GetEmployeeForCurrentUserAsync();
            if (employee == null || request.EmployeeId != employee.Id)
            {
                // Admin and HR Manager can cancel any request
                if (!_authorization.IsAdmin() && !_authorization.IsHRManager())
                    return Fail<LeaveRequestResponseDto>("Access denied.");
            }

            if (RequestStatus.IsTerminal(request.Status))
                return Fail<LeaveRequestResponseDto>(
                    $"Cannot cancel a request that is already {request.Status}.");

            request.Status = RequestStatus.Cancelled;
            request.UpdatedAt = DateTime.UtcNow;

            _repository.Update(request);
            await _repository.SaveChangesAsync();

            var updated = await _repository.GetByIdAsync(request.Id, _currentUser.CompanyId);
            return Ok(MapToDto(updated!));
        }

        // ════════════════════════════════════════════════════════════════
        // SUMMARY — leave balance report per employee
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<IEnumerable<LeaveSummaryDto>>> GetSummaryAsync(
            int year, Guid? employeeId, Guid? departmentId)
        {
            if (year < 2000 || year > DateTime.UtcNow.Year + 1)
                return Fail<IEnumerable<LeaveSummaryDto>>(
                    "Invalid year.");

            // Supervisor scoped to their branch
            if (_authorization.IsSupervisor())
            {
                if (employeeId.HasValue)
                {
                    var inBranch = await _context.Employees.AnyAsync(x =>
                        x.Id == employeeId &&
                        x.BranchId == _currentUser.BranchId);

                    if (!inBranch)
                        return Fail<IEnumerable<LeaveSummaryDto>>("Access denied.");
                }
            }

            var summary = await _repository.GetSummaryAsync(
                _currentUser.CompanyId, year, employeeId, departmentId);

            return Ok(summary);
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

        private static LeaveRequestResponseDto MapToDto(LeaveRequest r)
        {
            var totalDays = r.EndDate.DayNumber - r.StartDate.DayNumber + 1;

            return new LeaveRequestResponseDto
            {
                Id = r.Id,
                EmployeeId = r.EmployeeId,
                EmployeeName = r.Employee?.FullName ?? string.Empty,
                EmployeeCode = r.Employee?.EmployeeCode ?? string.Empty,
                LeaveTypeId = r.LeaveTypeId,
                LeaveTypeName = r.LeaveType?.Name ?? string.Empty,
                IsPaid = r.LeaveType?.IsPaid ?? false,
                StartDate = r.StartDate,
                EndDate = r.EndDate,
                TotalDays = totalDays,
                Reason = r.Reason,
                Status = r.Status,
                ApprovedBy = r.ApprovedBy,
                ApprovedByName = r.ApprovedByNavigation?.FullName,
                ApprovedAt = r.ApprovedAt,
                CreatedAt = r.CreatedAt
            };
        }

        private static ApiResponse<T> Ok<T>(T data) => new()
        { Success = true, Data = data, Message = string.Empty, Errors = null };

        private static ApiResponse<T> Fail<T>(string message) => new()
        { Success = false, Data = default, Message = message, Errors = null };
    }
}
