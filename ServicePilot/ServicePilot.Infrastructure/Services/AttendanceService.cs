using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Attendance;
using ServicePilot.Application.DTOs.GPS;
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
    public class AttendanceService : IAttendanceService
    {
        private readonly IAttendanceRepository _repository;
        private readonly ICurrentUserService _currentUser;
        private readonly IAuthService _authorization;
        private readonly AppDbContext _context;

        // ── Shift configuration ──────────────────────────────────────────
        // Future: load these from app_settings table per company.
        // ShiftStart:  employees who check in at or before GracePeriodEnd → Present
        // GraceEnd:    employees who check in after GracePeriodEnd → Late
        private static readonly TimeSpan ShiftStart = new(8, 0, 0);   // 08:00 UTC
        private static readonly TimeSpan GracePeriodEnd = new(8, 15, 0); // 08:15 UTC

        public AttendanceService(
            IAttendanceRepository repository,
            ICurrentUserService currentUser,
            IAuthService authorization,
            AppDbContext context)
        {
            _repository = repository;
            _currentUser = currentUser;
            _authorization = authorization;
            _context = context;
        }

        // ════════════════════════════════════════════════════════════════
        // CHECK-IN
        // ════════════════════════════════════════════════════════════════


        public async Task<ApiResponse<AttendanceResponseDto>> CheckInAsync(CheckInRequestDto dto)
        {
            var employee = await GetEmployeeForCurrentUserAsync();
            if (employee == null)
                return Fail<AttendanceResponseDto>(
                    "No employee profile is linked to this user account.");

            var existing = await _repository.GetOpenCheckInAsync(
                employee.Id, _currentUser.CompanyId);

            if (existing != null)
                return Fail<AttendanceResponseDto>(
                    "You have already checked in today. Please check out first.");

            var checkInTime = dto.IsOfflineSync && dto.CheckInTimeOverride.HasValue
                ? DateTime.SpecifyKind(dto.CheckInTimeOverride.Value, DateTimeKind.Utc)
                : DateTime.UtcNow;

            var status = DetermineStatus(checkInTime);

            var log = new AttendanceLog
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.CompanyId,
                EmployeeId = employee.Id,
                CheckInTime = checkInTime,        // DateTime — not nullable in entity
                CheckInLat = dto.Latitude,
                CheckInLng = dto.Longitude,
                Status = status,
                IsOfflineSync = dto.IsOfflineSync,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddAsync(log);
            await WriteGpsLogAsync(employee.Id, dto.Latitude, dto.Longitude,
                dto.Accuracy, checkInTime);
            await _repository.SaveChangesAsync();
            // ✅ ApiResponse<AttendanceResponseDto> via Ok() helper
            return Ok(MapToDto(log, employee));

        }

        // ════════════════════════════════════════════════════════════════
        // CHECK-OUT
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<AttendanceResponseDto>> CheckOutAsync(CheckOutRequestDto dto)
        {
            var employee = await GetEmployeeForCurrentUserAsync();
            if (employee == null)
                return Fail<AttendanceResponseDto>(
                    "No employee profile is linked to this user account.");

            var log = await _repository.GetOpenCheckInAsync(
                employee.Id, _currentUser.CompanyId);

            if (log == null)
                return Fail<AttendanceResponseDto>(
                    "No open check-in found for today. Please check in first.");

            var checkOutTime = dto.IsOfflineSync && dto.CheckOutTimeOverride.HasValue
                ? DateTime.SpecifyKind(dto.CheckOutTimeOverride.Value, DateTimeKind.Utc)
                : DateTime.UtcNow;

            // ✅ FIX: CheckInTime may be DateTime? in your entity — use .GetValueOrDefault()
            // If your entity has CheckInTime as DateTime (not nullable) just use log.CheckInTime directly
            var checkInTime = log.CheckInTime is DateTime ci ? ci : log.CheckInTime.GetValueOrDefault();

            if (checkOutTime <= checkInTime)
                return Fail<AttendanceResponseDto>(
                    "Check-out time cannot be before or equal to check-in time.");

            log.CheckOutTime = checkOutTime;
            log.CheckOutLat = dto.Latitude;
            log.CheckOutLng = dto.Longitude;
            log.UpdatedAt = DateTime.UtcNow;

            _repository.Update(log);
            await WriteGpsLogAsync(employee.Id, dto.Latitude, dto.Longitude,
                dto.Accuracy, checkOutTime);
            await _repository.SaveChangesAsync();

            // ✅ ApiResponse<AttendanceResponseDto> via Ok() helper
            return Ok(MapToDto(log, employee));
        }

        // ════════════════════════════════════════════════════════════════
        // DASHBOARD
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<AttendanceDashboardDto>> GetDashboardAsync()
        {
            var companyId = _currentUser.CompanyId;

            var employeeQuery = _context.Employees
                .AsNoTracking()
                .Where(x => x.CompanyId == companyId && x.IsActive);

            if (_authorization.IsSupervisor())
                employeeQuery = employeeQuery
                    .Where(x => x.BranchId == _currentUser.BranchId);

            var totalEmployees = await employeeQuery.CountAsync();

            var todayLogs = (await _repository.GetTodayAsync(companyId)).ToList();

            if (_authorization.IsSupervisor())
                todayLogs = todayLogs
                    .Where(x => x.Employee.BranchId == _currentUser.BranchId)
                    .ToList();

            var dashboard = new AttendanceDashboardDto
            {
                Date = DateOnly.FromDateTime(DateTime.UtcNow),
                TotalEmployees = totalEmployees,
                CheckedIn = todayLogs.Count,
                CheckedOut = todayLogs.Count(x => x.CheckOutTime.HasValue),
                Late = todayLogs.Count(x => x.Status == AttendanceStatus.Late),
                Absent = totalEmployees - todayLogs.Count,
                OfflineSynced = todayLogs.Count(x => x.IsOfflineSync),
                ActiveEmployees = todayLogs
                    .Where(x => x.CheckOutTime == null)
                    .Select(x => MapToDto(x, x.Employee))
                    .ToList()
            };

            // ✅ ApiResponse<AttendanceDashboardDto> via Ok() helper
            return Ok(dashboard);
        }

        // ════════════════════════════════════════════════════════════════
        // PAGED LIST
        // ════════════════════════════════════════════════════════════════
        public async Task<ApiResponse<PagedResult<AttendanceResponseDto>>> GetPagedAsync(PagedAttendanceRequest filter)
        {
            if (_authorization.IsSupervisor())
                filter.BranchId = _currentUser.BranchId;

            var result = await _repository.GetPagedAsync(_currentUser.CompanyId, filter);

            // ✅ ApiResponse<PagedResult<AttendanceResponseDto>> via Ok() helper
            return Ok(new PagedResult<AttendanceResponseDto>
            {
                Items = result.Items.Select(x => MapToDto(x, x.Employee)).ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize
            });
        }

        // ════════════════════════════════════════════════════════════════
        // SUMMARY
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<IEnumerable<AttendanceSummaryDto>>> GetSummaryAsync(DateOnly from, DateOnly to, Guid? branchId, Guid? departmentId)
        {
            if (from > to)
                // ✅ ApiResponse<IEnumerable<AttendanceSummaryDto>> Fail
                return Fail<IEnumerable<AttendanceSummaryDto>>(
                    "DateFrom must be on or before DateTo.");

            if ((to.DayNumber - from.DayNumber) > 90)
                // ✅ ApiResponse<IEnumerable<AttendanceSummaryDto>> Fail
                return Fail<IEnumerable<AttendanceSummaryDto>>(
                    "Date range cannot exceed 90 days.");

            if (_authorization.IsSupervisor())
                branchId = _currentUser.BranchId;

            var summary = await _repository.GetSummaryAsync(
                _currentUser.CompanyId, from, to, branchId, departmentId);

            // ✅ ApiResponse<IEnumerable<AttendanceSummaryDto>> via Ok() helper
            return Ok(summary);
        }

        // ════════════════════════════════════════════════════════════════
        // TODAY — mobile app "my status" screen
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<AttendanceResponseDto>> GetTodayForEmployeeAsync()
        {
            var employee = await GetEmployeeForCurrentUserAsync();
            if (employee == null)
                return Fail<AttendanceResponseDto>(
                    "No employee profile is linked to this user account.");

            // ✅ FIX: use range instead of .Date (EF/Npgsql cannot translate .Date on DateTime?)
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var log = await _context.AttendanceLogs
                .AsNoTracking()
                .Where(x =>
                    x.EmployeeId == employee.Id &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.CheckInTime >= todayStart &&
                    x.CheckInTime < todayEnd)
                .OrderByDescending(x => x.CheckInTime)
                .FirstOrDefaultAsync();

            if (log == null)
                // ✅ No record is not an error — return Success=true, Data=null, Message set
                return new ApiResponse<AttendanceResponseDto>
                {
                    Success = true,
                    Data = null,
                    Message = "No attendance record for today.",
                    Errors = null
                };

            // ✅ ApiResponse<AttendanceResponseDto> via Ok() helper
            return Ok(MapToDto(log, employee));
        }

        /// <summary>
        /// Employee's own attendance history — paged, ordered newest first.
        /// Only returns records belonging to the calling employee.
        /// </summary>
        public async Task<ApiResponse<PagedResult<AttendanceResponseDto>>> GetMyHistoryAsync(int page, int pageSize)
        {
            var employee = await GetEmployeeForCurrentUserAsync();
            if (employee == null)
                return Fail<PagedResult<AttendanceResponseDto>>(
                    "No employee profile is linked to this user account.");

            var query = _context.AttendanceLogs
                .AsNoTracking()
                .Where(x =>
                    x.EmployeeId == employee.Id &&
                    x.CompanyId == _currentUser.CompanyId)
                .OrderByDescending(x => x.CheckInTime);

            var total = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = items.Select(x => MapToDto(x, employee)).ToList();

            return Ok(new PagedResult<AttendanceResponseDto>
            {
                Items      = dtos,
                TotalCount = total,
                Page       = page,
                PageSize   = pageSize,
            });
        }

        // ════════════════════════════════════════════════════════════════
        // MANUAL ADJUSTMENT — supervisor / admin corrects a record
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<AttendanceResponseDto>> AdjustAttendanceAsync(
            Guid recordId, AdjustAttendanceRequestDto dto)
        {
            // Load record with Employee + Branch for scope check
            var log = await _context.AttendanceLogs
                .Include(x => x.Employee)
                    .ThenInclude(e => e.Branch)
                .FirstOrDefaultAsync(x =>
                    x.Id == recordId &&
                    x.CompanyId == _currentUser.CompanyId);

            if (log == null)
                return Fail<AttendanceResponseDto>(
                    "Attendance record not found.");

            // Supervisor can only adjust employees in their own branch
            if (_authorization.IsSupervisor() &&
                log.Employee.BranchId != _currentUser.BranchId)
                return Fail<AttendanceResponseDto>(
                    "You can only adjust attendance records for employees in your branch.");

            // Check-in cannot be in the future
            if (dto.CheckInTime > DateTime.UtcNow.AddMinutes(5))
                return Fail<AttendanceResponseDto>(
                    "Check-in time cannot be set to a future date/time.");

            // If checkout provided: must be strictly after check-in
            if (dto.CheckOutTime.HasValue && dto.CheckOutTime.Value <= dto.CheckInTime)
                return Fail<AttendanceResponseDto>(
                    "Check-out time must be after check-in time.");

            // Apply changes — ensure UTC kind so Npgsql writes to timestamptz correctly
            log.CheckInTime  = DateTime.SpecifyKind(dto.CheckInTime, DateTimeKind.Utc);
            log.CheckOutTime = dto.CheckOutTime.HasValue
                ? DateTime.SpecifyKind(dto.CheckOutTime.Value, DateTimeKind.Utc)
                : (DateTime?)null;   // null = clears checkout → employee can re-checkout via mobile
            log.Status       = DetermineStatus(dto.CheckInTime);
            log.UpdatedAt    = DateTime.UtcNow;
            // GPS coords are deliberately NOT changed — they reflect the real device location

            _repository.Update(log);
            await _repository.SaveChangesAsync();

            return Ok(MapToDto(log, log.Employee));
        }

        // ════════════════════════════════════════════════════════════════
        // MANUAL CREATE — supervisor/admin creates record for forgotten check-in
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<AttendanceResponseDto>> CreateManualAsync(
            CreateManualAttendanceDto dto)
        {
            var employee = await _context.Employees
                .AsNoTracking()
                .Include(e => e.Branch)
                .FirstOrDefaultAsync(e =>
                    e.Id == dto.EmployeeId &&
                    e.CompanyId == _currentUser.CompanyId &&
                    e.IsActive);

            if (employee == null)
                return Fail<AttendanceResponseDto>("Employee not found.");

            if (_authorization.IsSupervisor() &&
                employee.BranchId != _currentUser.BranchId)
                return Fail<AttendanceResponseDto>(
                    "You can only create records for employees in your branch.");

            if (dto.CheckInTime > DateTime.UtcNow.AddMinutes(5))
                return Fail<AttendanceResponseDto>(
                    "Check-in time cannot be in the future.");

            if (dto.CheckOutTime.HasValue && dto.CheckOutTime.Value <= dto.CheckInTime)
                return Fail<AttendanceResponseDto>(
                    "Check-out time must be after check-in time.");

            var log = new AttendanceLog
            {
                Id            = Guid.NewGuid(),
                CompanyId     = _currentUser.CompanyId,
                EmployeeId    = dto.EmployeeId,
                CheckInTime   = DateTime.SpecifyKind(dto.CheckInTime, DateTimeKind.Utc),
                CheckOutTime  = dto.CheckOutTime.HasValue
                    ? DateTime.SpecifyKind(dto.CheckOutTime.Value, DateTimeKind.Utc)
                    : (DateTime?)null,
                CheckInLat    = 0,
                CheckInLng    = 0,
                Status        = DetermineStatus(dto.CheckInTime),
                IsOfflineSync = true,   // flag as manual/admin entry for audit
                CreatedAt     = DateTime.UtcNow
            };

            await _repository.AddAsync(log);
            await _repository.SaveChangesAsync();

            return Ok(MapToDto(log, employee));
        }

        public async Task<ApiResponse<bool>> LogGpsAsync(GpsLogRequestDto dto)
        {
            var employee = await GetEmployeeForCurrentUserAsync();
            if (employee == null)
                // ✅ ApiResponse<bool> Fail
                return Fail<bool>("No employee profile is linked to this user account.");

            await WriteGpsLogAsync(employee.Id, dto.Latitude, dto.Longitude,
                dto.Accuracy, dto.RecordedAt);
            await _context.SaveChangesAsync();

            // ✅ ApiResponse<bool> via Ok() helper
            return Ok(true);
        }

        // ════════════════════════════════════════════════════════════════
        // PRIVATE HELPERS
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

        // ── Response wrappers — always produce your exact ApiResponse<T> shape ──
        private static ApiResponse<T> Ok<T>(T data) => new()
        {
            Success = true,
            Data = data,
            Message = string.Empty,
            Errors = null
        };

        private static ApiResponse<T> Fail<T>(string message) => new()
        {
            Success = false,
            Data = default,
            Message = message,
            Errors = null
        };

        private static string DetermineStatus(DateTime checkInTime)
        {
            return checkInTime.TimeOfDay <= GracePeriodEnd
                ? AttendanceStatus.Present
                : AttendanceStatus.Late;
        }

        private async Task WriteGpsLogAsync(
            Guid employeeId, decimal lat, decimal lng,
            decimal? accuracy, DateTime recordedAt)
        {
            await _context.GpsLogs.AddAsync(new GpsLog
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.CompanyId,
                EmployeeId = employeeId,
                Latitude = lat,
                Longitude = lng,
                Accuracy = accuracy,
                RecordedAt = recordedAt,
                CreatedAt = DateTime.UtcNow
            });
        }

        // ════════════════════════════════════════════════════════════════
        // LIVE LOCATIONS — latest GPS ping per checked-in employee
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<IEnumerable<LiveLocationDto>>> GetLiveLocationsAsync()
        {
            var today = DateTime.UtcNow.Date;

            // All active employees in the company (scoped to branch for Supervisor)
            var employeeQuery = _context.Employees
                .AsNoTracking()
                .Include(e => e.Branch)
                .Where(e => e.CompanyId == _currentUser.CompanyId && e.IsActive);

            if (_authorization.IsSupervisor())
                employeeQuery = employeeQuery.Where(e => e.BranchId == _currentUser.BranchId);

            var employees = await employeeQuery.ToListAsync();
            var employeeIds = employees.Select(e => e.Id).ToList();

            // Today's attendance logs
            var attendanceLogs = await _context.AttendanceLogs
                .AsNoTracking()
                .Where(a =>
                    a.CompanyId == _currentUser.CompanyId &&
                    employeeIds.Contains(a.EmployeeId) &&
                    a.CheckInTime >= today)
                .ToListAsync();

            // Latest GPS log per employee (last 24 h)
            var since = DateTime.UtcNow.AddHours(-24);
            var latestGps = await _context.GpsLogs
                .AsNoTracking()
                .Where(g =>
                    g.CompanyId == _currentUser.CompanyId &&
                    employeeIds.Contains(g.EmployeeId) &&
                    g.RecordedAt >= since)
                .GroupBy(g => g.EmployeeId)
                .Select(grp => grp.OrderByDescending(g => g.RecordedAt).First())
                .ToListAsync();

            var gpsByEmployee = latestGps.ToDictionary(g => g.EmployeeId);
            var attByEmployee = attendanceLogs
                .GroupBy(a => a.EmployeeId)
                .ToDictionary(grp => grp.Key, grp => grp.OrderByDescending(a => a.CheckInTime).First());

            var result = employees.Select(emp =>
            {
                gpsByEmployee.TryGetValue(emp.Id, out var gps);
                attByEmployee.TryGetValue(emp.Id, out var att);

                string status = att == null
                    ? "NotCheckedIn"
                    : att.CheckOutTime == null ? "CheckedIn" : "CheckedOut";

                return new LiveLocationDto
                {
                    EmployeeId       = emp.Id,
                    EmployeeName     = emp.FullName,
                    EmployeeCode     = emp.EmployeeCode,
                    PhoneNumber      = emp.PhoneNumber,
                    BranchName       = emp.Branch?.Name,
                    Latitude         = gps != null ? (double?)gps.Latitude : null,
                    Longitude        = gps != null ? (double?)gps.Longitude : null,
                    LastSeenAt       = gps?.RecordedAt,
                    AttendanceStatus = status
                };
            }).ToList();

            return Ok<IEnumerable<LiveLocationDto>>(result);
        }

        /// <summary>
        /// Maps AttendanceLog + Employee to AttendanceResponseDto.
        /// HoursWorked is computed here — never stored in DB.
        ///
        /// ✅ Handles both nullable and non-nullable CheckInTime:
        ///    If your entity has CheckInTime as DateTime  → use directly
        ///    If your entity has CheckInTime as DateTime? → use .GetValueOrDefault()
        /// </summary>
        private static AttendanceResponseDto MapToDto(AttendanceLog log, Employee employee)
        {
            // Safely unwrap CheckInTime regardless of whether entity is DateTime or DateTime?
            // If your entity already has it as DateTime (non-nullable), this still compiles fine.
            var checkIn = log.CheckInTime is DateTime dt ? dt : log.CheckInTime.GetValueOrDefault();

            double? hoursWorked = null;
            if (log.CheckOutTime.HasValue)
                hoursWorked = Math.Round(
                    (log.CheckOutTime.Value - checkIn).TotalHours, 2);

            return new AttendanceResponseDto
            {
                Id = log.Id,
                EmployeeId = log.EmployeeId,
                EmployeeName = employee.FullName,
                EmployeeCode = employee.EmployeeCode,
                CheckInTime = checkIn,
                CheckInLat = log.CheckInLat,
                CheckInLng = log.CheckInLng,
                CheckOutTime = log.CheckOutTime,
                CheckOutLat = log.CheckOutLat,
                CheckOutLng = log.CheckOutLng,
                Status = log.Status ?? string.Empty,
                HoursWorked = hoursWorked,
                IsOfflineSync = log.IsOfflineSync,
                CreatedAt = log.CreatedAt
            };
        }

    }
}
