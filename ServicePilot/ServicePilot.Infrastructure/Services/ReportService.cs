using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Reports;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;
using ServicePilot.Infrastructure.Persistence.Models;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Infrastructure.Services
{
    public class ReportService : IReportService
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IAuthService _authorization;

        public ReportService(
            AppDbContext context,
            ICurrentUserService currentUser,
            IAuthService authorization)
        {
            _context = context;
            _currentUser = currentUser;
            _authorization = authorization;
        }

        // ════════════════════════════════════════════════════════════════
        // ATTENDANCE REPORT
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<AttendanceReportDto>> GetAttendanceReportAsync(
            DateOnly from, DateOnly to,
            Guid? branchId, Guid? departmentId)
        {
            if (from > to)
                return Fail<AttendanceReportDto>("From date must be before To date.");

            if ((to.DayNumber - from.DayNumber) > 90)
                return Fail<AttendanceReportDto>("Date range cannot exceed 90 days.");

            // Supervisor locked to their branch
            if (_authorization.IsSupervisor())
                branchId = _currentUser.BranchId;

            var companyId = _currentUser.CompanyId;
            var fromDt = from.ToDateTime(TimeOnly.MinValue);
            var toDt = to.ToDateTime(TimeOnly.MaxValue);

            var employeeQuery = _context.Employees
                .AsNoTracking()
                .Include(x => x.Department)
                .Include(x => x.Branch)
                .Where(x => x.CompanyId == companyId && x.IsActive);

            if (branchId.HasValue)
                employeeQuery = employeeQuery.Where(x => x.BranchId == branchId);

            if (departmentId.HasValue)
                employeeQuery = employeeQuery.Where(x => x.DepartmentId == departmentId);

            var employees = await employeeQuery.ToListAsync();

            var logs = await _context.AttendanceLogs
                .AsNoTracking()
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.CheckInTime >= fromDt &&
                    x.CheckInTime <= toDt)
                .ToListAsync();

            var totalDays = to.DayNumber - from.DayNumber + 1;

            var rows = employees.Select(emp =>
            {
                var empLogs = logs.Where(l => l.EmployeeId == emp.Id).ToList();

                var present = empLogs.Count(l => l.Status == AttendanceStatus.Present);
                var late = empLogs.Count(l => l.Status == AttendanceStatus.Late);
                var absent = totalDays - empLogs.Count;
                var offline = empLogs.Count(l => l.IsOfflineSync);

                var totalHours = empLogs
    .Where(l => l.CheckOutTime.HasValue && l.CheckInTime.HasValue)
    .Sum(l => (l.CheckOutTime!.Value - l.CheckInTime!.Value).TotalHours);

                var avgHours = empLogs.Count > 0
                    ? Math.Round(totalHours / empLogs.Count, 2) : 0;

                var checkInTimes = empLogs
                    .Where(l => l.CheckInTime.HasValue && l.Status != AttendanceStatus.Absent)
                    .Select(l => l.CheckInTime!.Value.TimeOfDay)
                    .ToList();

                string? avgCheckIn = null;
                if (checkInTimes.Any())
                {
                    var avgTicks = (long)checkInTimes.Average(t => t.Ticks);
                    avgCheckIn = TimeSpan.FromTicks(avgTicks).ToString(@"hh\:mm");
                }

                return new AttendanceReportRowDto
                {
                    EmployeeId = emp.Id,
                    EmployeeName = emp.FullName,
                    EmployeeCode = emp.EmployeeCode,
                    DepartmentName = emp.Department?.Name,
                    BranchName = emp.Branch?.Name,
                    PresentDays = present,
                    LateDays = late,
                    AbsentDays = Math.Max(0, absent),
                    TotalHoursWorked = Math.Round(totalHours, 2),
                    AverageHoursPerDay = avgHours,
                    AverageCheckIn = avgCheckIn,
                    OfflineSyncCount = offline
                };
            })
            .OrderBy(x => x.EmployeeName)
            .ToList();

            return Ok(new AttendanceReportDto
            {
                ReportFrom = from,
                ReportTo = to,
                TotalDays = totalDays,
                Rows = rows
            });
        }

        // ════════════════════════════════════════════════════════════════
        // JOB REPORT
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<JobReportDto>> GetJobReportAsync(
            DateOnly from, DateOnly to, Guid? branchId)
        {
            if (from > to)
                return Fail<JobReportDto>("From date must be before To date.");

            if (_authorization.IsSupervisor())
                branchId = _currentUser.BranchId;

            var companyId = _currentUser.CompanyId;
            var fromDt = from.ToDateTime(TimeOnly.MinValue);
            var toDt = to.ToDateTime(TimeOnly.MaxValue);

            var jobQuery = _context.Jobs
                .AsNoTracking()
                .Include(x => x.AssignedEmployee)
                .Include(x => x.JobType)
                .Include(x => x.JobStatus)
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.CreatedAt >= fromDt &&
                    x.CreatedAt <= toDt);

            if (branchId.HasValue)
            {
                var branchEmpIds = await _context.Employees
                    .Where(x => x.CompanyId == companyId && x.BranchId == branchId)
                    .Select(x => x.Id)
                    .ToListAsync();

                jobQuery = jobQuery.Where(x =>
                    x.AssignedEmployeeId != null &&
                    branchEmpIds.Contains(x.AssignedEmployeeId!.Value));
            }

            var jobs = await jobQuery.ToListAsync();

            var totalJobs = jobs.Count;
            var completedJobs = jobs.Count(x => x.CompletedAt.HasValue);
            var activeJobs = totalJobs - completedJobs;
            var completionRate = totalJobs > 0
                ? Math.Round((double)completedJobs / totalJobs * 100, 1) : 0;

            var rows = jobs
                .Where(x => x.AssignedEmployeeId.HasValue)
                .GroupBy(x => new
                {
                    x.AssignedEmployeeId,
                    Name = x.AssignedEmployee?.FullName ?? string.Empty,
                    Code = x.AssignedEmployee?.EmployeeCode ?? string.Empty
                })
                .Select(g =>
                {
                    var completed = g.Where(x => x.CompletedAt.HasValue).ToList();
                    var inProgress = g.Count(x => !x.CompletedAt.HasValue);
                    var rate = g.Count() > 0
                        ? Math.Round((double)completed.Count / g.Count() * 100, 1) : 0;

                    double? avgDuration = null;
                    var withDuration = completed
                        .Where(x => x.StartedAt.HasValue)
                        .ToList();

                    if (withDuration.Any())
                        avgDuration = Math.Round(
                            withDuration.Average(x =>
                                (x.CompletedAt!.Value - x.StartedAt!.Value).TotalHours), 2);

                    return new JobReportRowDto
                    {
                        EmployeeId = g.Key.AssignedEmployeeId!.Value,
                        EmployeeName = g.Key.Name,
                        EmployeeCode = g.Key.Code,
                        TotalAssigned = g.Count(),
                        Completed = completed.Count,
                        InProgress = inProgress,
                        CompletionRate = rate,
                        AvgDurationHours = avgDuration
                    };
                })
                .OrderByDescending(x => x.Completed)
                .ToList();

            // Individual job rows for the detail table
            var jobRows = jobs
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new JobReportJobRow
                {
                    Id                   = x.Id,
                    JobNumber            = x.JobNumber ?? string.Empty,
                    CustomerName         = x.CustomerName ?? string.Empty,
                    JobTypeName          = x.JobType?.Name,
                    StatusName           = x.JobStatus?.Name,
                    StatusColor          = x.JobStatus?.ColorCode,
                    AssignedEmployeeName = x.AssignedEmployee?.FullName,
                    AssignedEmployeeCode = x.AssignedEmployee?.EmployeeCode,
                    PriorityLabel        = x.Priority ?? "Medium",
                    ScheduledAt          = x.ScheduledAt,
                    CompletedAt          = x.CompletedAt,
                    CreatedAt            = x.CreatedAt,
                })
                .ToList();

            return Ok(new JobReportDto
            {
                ReportFrom     = from,
                ReportTo       = to,
                TotalJobs      = totalJobs,
                CompletedJobs  = completedJobs,
                ActiveJobs     = activeJobs,
                CompletionRate = completionRate,
                Rows           = rows,
                Jobs           = jobRows,
            });
        }

        // ════════════════════════════════════════════════════════════════
        // LEAVE + OVERTIME REPORT
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<LeaveReportDto>> GetLeaveReportAsync(
            int year, Guid? branchId, Guid? departmentId)
        {
            if (year < 2000 || year > DateTime.UtcNow.Year + 1)
                return Fail<LeaveReportDto>("Invalid year.");

            if (_authorization.IsSupervisor())
                branchId = _currentUser.BranchId;

            var companyId = _currentUser.CompanyId;
            var yearStart = new DateOnly(year, 1, 1);
            var yearEnd = new DateOnly(year, 12, 31);

            var employeeQuery = _context.Employees
                .AsNoTracking()
                .Include(x => x.Department)
                .Where(x => x.CompanyId == companyId && x.IsActive);

            if (branchId.HasValue)
                employeeQuery = employeeQuery.Where(x => x.BranchId == branchId);

            if (departmentId.HasValue)
                employeeQuery = employeeQuery.Where(x => x.DepartmentId == departmentId);

            var employees = await employeeQuery.ToListAsync();
            var empIds = employees.Select(x => x.Id).ToList();

            var leaves = await _context.LeaveRequests
                .AsNoTracking()
                .Where(x =>
                    x.CompanyId == companyId &&
                    empIds.Contains(x.EmployeeId) &&
                    x.StartDate >= yearStart &&
                    x.EndDate <= yearEnd)
                .ToListAsync();

            var overtimes = await _context.OvertimeRequests
                .AsNoTracking()
                .Where(x =>
                    x.CompanyId == companyId &&
                    empIds.Contains(x.EmployeeId) &&
                    x.RequestDate >= yearStart &&
                    x.RequestDate <= yearEnd)
                .ToListAsync();

            var rows = employees.Select(emp =>
            {
                var empLeaves = leaves.Where(l => l.EmployeeId == emp.Id).ToList();
                var empOvertimes = overtimes.Where(o => o.EmployeeId == emp.Id).ToList();

                var approvedLeaveDays = empLeaves
                    .Where(l => l.Status == RequestStatus.Approved)
                    .Sum(l => l.EndDate.DayNumber - l.StartDate.DayNumber + 1);

                var pendingLeaveDays = empLeaves
                    .Where(l => l.Status == RequestStatus.Pending)
                    .Sum(l => l.EndDate.DayNumber - l.StartDate.DayNumber + 1);

                return new LeaveReportRowDto
                {
                    EmployeeId = emp.Id,
                    EmployeeName = emp.FullName,
                    EmployeeCode = emp.EmployeeCode,
                    DepartmentName = emp.Department?.Name,
                    ApprovedLeaveDays = approvedLeaveDays,
                    PendingLeaveDays = pendingLeaveDays,
                    RejectedLeaveCount = empLeaves.Count(l => l.Status == RequestStatus.Rejected),
                    ApprovedOvertimeHours = empOvertimes
                        .Where(o => o.Status == RequestStatus.Approved)
                        .Sum(o => o.HoursRequested),
                    PendingOvertimeHours = empOvertimes
                        .Where(o => o.Status == RequestStatus.Pending)
                        .Sum(o => o.HoursRequested),
                    RejectedOvertimeCount = empOvertimes.Count(o => o.Status == RequestStatus.Rejected)
                };
            })
            .OrderBy(x => x.EmployeeName)
            .ToList();

            return Ok(new LeaveReportDto { Year = year, Rows = rows });
        }

        // ════════════════════════════════════════════════════════════════
        // EXPIRY REPORT
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<ExpiryReportDto>> GetExpiryReportAsync(int days)
        {
            if (days < 1) days = 1;
            if (days > 365) days = 365;

            var companyId = _currentUser.CompanyId;
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var threshold = today.AddDays(days);

            var employees = await _context.Employees
                .AsNoTracking()
                .Include(x => x.Branch)
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.IsActive &&
                    (
                        (x.VisaExpiryDate != null && x.VisaExpiryDate <= threshold) ||
                        (x.PassportExpiryDate != null && x.PassportExpiryDate <= threshold) ||
                        (x.EmiratesIdExpiryDate != null && x.EmiratesIdExpiryDate <= threshold)
                    ))
                .OrderBy(x => x.VisaExpiryDate)
                .ToListAsync();

            var rows = employees.Select(emp =>
            {
                var visaDays = emp.VisaExpiryDate.HasValue
                    ? emp.VisaExpiryDate.Value.DayNumber - today.DayNumber
                    : (int?)null;

                var passportDays = emp.PassportExpiryDate.HasValue
                    ? emp.PassportExpiryDate.Value.DayNumber - today.DayNumber
                    : (int?)null;

                var emiratesDays = emp.EmiratesIdExpiryDate.HasValue
                    ? emp.EmiratesIdExpiryDate.Value.DayNumber - today.DayNumber
                    : (int?)null;

                return new ExpiryReportRowDto
                {
                    EmployeeId = emp.Id,
                    EmployeeName = emp.FullName,
                    EmployeeCode = emp.EmployeeCode,
                    BranchName = emp.Branch?.Name,
                    PhoneNumber = emp.PhoneNumber,
                    VisaExpiryDate = emp.VisaExpiryDate.HasValue && emp.VisaExpiryDate <= threshold
                        ? emp.VisaExpiryDate : null,
                    VisaDaysLeft = emp.VisaExpiryDate.HasValue && emp.VisaExpiryDate <= threshold
                        ? visaDays : null,
                    PassportExpiryDate = emp.PassportExpiryDate.HasValue && emp.PassportExpiryDate <= threshold
                        ? emp.PassportExpiryDate : null,
                    PassportDaysLeft = emp.PassportExpiryDate.HasValue && emp.PassportExpiryDate <= threshold
                        ? passportDays : null,
                    EmiratesIdExpiryDate = emp.EmiratesIdExpiryDate.HasValue && emp.EmiratesIdExpiryDate <= threshold
                        ? emp.EmiratesIdExpiryDate : null,
                    EmiratesIdDaysLeft = emp.EmiratesIdExpiryDate.HasValue && emp.EmiratesIdExpiryDate <= threshold
                        ? emiratesDays : null,
                    HasExpired = (visaDays.HasValue && visaDays < 0) ||
                                           (passportDays.HasValue && passportDays < 0) ||
                                           (emiratesDays.HasValue && emiratesDays < 0)
                };
            })
            .OrderBy(x =>
                Math.Min(
                    x.VisaDaysLeft ?? int.MaxValue,
                    Math.Min(
                        x.PassportDaysLeft ?? int.MaxValue,
                        x.EmiratesIdDaysLeft ?? int.MaxValue)))
            .ToList();

            return Ok(new ExpiryReportDto
            {
                DaysThreshold = days,
                TotalAffected = rows.Count,
                Rows = rows
            });
        }

        private static ApiResponse<T> Ok<T>(T data) => new()
        { Success = true, Data = data, Message = string.Empty, Errors = null };

        private static ApiResponse<T> Fail<T>(string message) => new()
        { Success = false, Data = default, Message = message, Errors = null };
    }
}
