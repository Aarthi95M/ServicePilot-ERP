using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Dashboard;
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
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IAuthService _authorization;

        public DashboardService(
            AppDbContext context,
            ICurrentUserService currentUser,
            IAuthService authorization)
        {
            _context = context;
            _currentUser = currentUser;
            _authorization = authorization;
        }

        // ════════════════════════════════════════════════════════════════
        // ADMIN DASHBOARD — company-wide
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<AdminDashboardDto>> GetAdminDashboardAsync()
        {
            var companyId = _currentUser.CompanyId;
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var in30Days = today.AddDays(30);
            var in7Days = DateTime.UtcNow.AddDays(7);

            // ── Run queries in parallel where possible ─────────────────

            var totalEmployeesTask = await _context.Employees
                .CountAsync(x => x.CompanyId == companyId && x.IsActive);

            var totalBranchesTask = await _context.Branches
                .CountAsync(x => x.CompanyId == companyId && x.IsActive);

            var totalActiveJobsTask = await _context.Jobs
                .CountAsync(x => x.CompanyId == companyId && x.CompletedAt == null);

            var pendingLeaveTask = await _context.LeaveRequests
                .CountAsync(x => x.CompanyId == companyId
                              && x.Status == RequestStatus.Pending);

            var pendingOvertimeTask = await _context.OvertimeRequests
                .CountAsync(x => x.CompanyId == companyId
                              && x.Status == RequestStatus.Pending);

            //await Task.WhenAll(
            //    totalEmployeesTask, totalBranchesTask,
            //    totalActiveJobsTask, pendingLeaveTask, pendingOvertimeTask);

            // ── Today's attendance ─────────────────────────────────────
            var todayLogs = await _context.AttendanceLogs
                .AsNoTracking()
                .Include(x => x.Employee)
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.CheckInTime >= todayStart &&
                    x.CheckInTime < todayEnd)
                .ToListAsync();

            //var totalEmployees = await totalEmployeesTask;
            var attendance = BuildAttendanceSnapshot(todayLogs, totalEmployeesTask, today);

            // ── Active employees (currently on-site) ──────────────────
            var activeEmployees = todayLogs
                .Where(x => x.CheckOutTime == null)
                .Select(x => new ActiveEmployeeDto
                {
                    EmployeeId = x.EmployeeId,
                    EmployeeName = x.Employee?.FullName ?? string.Empty,
                    EmployeeCode = x.Employee?.EmployeeCode ?? string.Empty,
                    CheckInTime = (DateTime)x.CheckInTime,
                    Latitude = x.CheckInLat,
                    Longitude = x.CheckInLng
                })
                .ToList();

            // ── Jobs by status ─────────────────────────────────────────
            var jobsByStatus = await _context.Jobs
                .AsNoTracking()
                .Include(x => x.JobStatus)
                .Where(x => x.CompanyId == companyId && x.CompletedAt == null)
                .GroupBy(x => new
                {
                    x.JobStatusId,
                    Name = x.JobStatus!.Name,
                    ColorCode = x.JobStatus.ColorCode
                })
                .Select(g => new JobStatusSummaryDto
                {
                    StatusId = g.Key.JobStatusId!.Value,
                    StatusName = g.Key.Name,
                    ColorCode = g.Key.ColorCode ?? "#888888",
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .ToListAsync();

            // ── Pending requests (top 10) ──────────────────────────────
            var pendingLeaves = await _context.LeaveRequests
                .AsNoTracking()
                .Include(x => x.Employee)
                .Include(x => x.LeaveType)
                .Where(x => x.CompanyId == companyId
                         && x.Status == RequestStatus.Pending)
                .OrderBy(x => x.CreatedAt)
                .Take(5)
                .ToListAsync();

            var pendingOvertimes = await _context.OvertimeRequests
                .AsNoTracking()
                .Include(x => x.Employee)
                .Where(x => x.CompanyId == companyId
                         && x.Status == RequestStatus.Pending)
                .OrderBy(x => x.CreatedAt)
                .Take(5)
                .ToListAsync();

            var pendingRequests = pendingLeaves
                .Select(l => new PendingRequestDto
                {
                    Id = l.Id,
                    Type = "Leave",
                    EmployeeName = l.Employee?.FullName ?? string.Empty,
                    EmployeeCode = l.Employee?.EmployeeCode ?? string.Empty,
                    Details = $"{l.LeaveType?.Name}: " +
                                   $"{l.EndDate.DayNumber - l.StartDate.DayNumber + 1} days " +
                                   $"({l.StartDate:dd MMM} – {l.EndDate:dd MMM})",
                    SubmittedAt = l.CreatedAt
                })
                .Concat(pendingOvertimes.Select(o => new PendingRequestDto
                {
                    Id = o.Id,
                    Type = "Overtime",
                    EmployeeName = o.Employee?.FullName ?? string.Empty,
                    EmployeeCode = o.Employee?.EmployeeCode ?? string.Empty,
                    Details = $"Overtime: {o.HoursRequested}h on {o.RequestDate:dd MMM yyyy}",
                    SubmittedAt = o.CreatedAt
                }))
                .OrderBy(x => x.SubmittedAt)
                .Take(10)
                .ToList();

            // ── Document expiry alerts ─────────────────────────────────
            var expiryAlerts = await BuildExpiryAlerts(companyId, today, in30Days, null);

            // ── Upcoming jobs (next 7 days) ────────────────────────────
            var upcomingJobs = await _context.Jobs
                .AsNoTracking()
                .Include(x => x.AssignedEmployee)
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.CompletedAt == null &&
                    x.ScheduledAt != null &&
                    x.ScheduledAt >= DateTime.UtcNow &&
                    x.ScheduledAt <= in7Days)
                .OrderBy(x => x.ScheduledAt)
                .Take(10)
                .Select(x => new UpcomingJobDto
                {
                    Id = x.Id,
                    JobNumber = x.JobNumber ?? string.Empty,
                    CustomerName = x.CustomerName,
                    Address = x.Address,
                    PriorityLabel = JobPriority.GetLabel(
                        JobPriority.GetValue(x.Priority ?? "Medium")),
                    AssignedEmployeeName = x.AssignedEmployee != null
                        ? x.AssignedEmployee.FullName : null,
                    ScheduledAt = x.ScheduledAt!.Value
                })
                .ToListAsync();

            var dashboard = new AdminDashboardDto
            {
                TotalActiveEmployees = totalEmployeesTask,
                TotalActiveBranches =  totalBranchesTask,
                TotalActiveJobs =  totalActiveJobsTask,
                PendingLeaveRequests =  pendingLeaveTask,
                PendingOvertimeRequests =  pendingOvertimeTask,
                ExpiringDocumentsCount = expiryAlerts.Count,
                TodayAttendance = attendance,
                JobsByStatus = jobsByStatus,
                PendingRequests = pendingRequests,
                ExpiryAlerts = expiryAlerts,
                ActiveEmployees = activeEmployees,
                UpcomingJobs = upcomingJobs,
                GeneratedAt = DateTime.UtcNow
            };

            return Ok(dashboard);
        }

        // ════════════════════════════════════════════════════════════════
        // SUPERVISOR DASHBOARD — branch-scoped
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<SupervisorDashboardDto>> GetSupervisorDashboardAsync()
        {
            var companyId = _currentUser.CompanyId;
            var branchId = _currentUser.BranchId;
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var in7Days = DateTime.UtcNow.AddDays(7);

            // Branch name
            var branch = await _context.Branches
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == branchId && x.CompanyId == companyId);

            // Branch employee IDs
            var branchEmployeeIds = await _context.Employees
                .AsNoTracking()
                .Where(x => x.CompanyId == companyId
                         && x.BranchId == branchId
                         && x.IsActive)
                .Select(x => x.Id)
                .ToListAsync();

            var totalBranchEmployees = branchEmployeeIds.Count;

            // Today's attendance for branch
            var todayLogs = await _context.AttendanceLogs
                .AsNoTracking()
                .Include(x => x.Employee)
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.CheckInTime >= todayStart &&
                    x.CheckInTime < todayEnd &&
                    branchEmployeeIds.Contains(x.EmployeeId))
                .ToListAsync();

            var attendance = BuildAttendanceSnapshot(todayLogs, totalBranchEmployees, today);

            var activeEmployees = todayLogs
                .Where(x => x.CheckOutTime == null)
                .Select(x => new ActiveEmployeeDto
                {
                    EmployeeId = x.EmployeeId,
                    EmployeeName = x.Employee?.FullName ?? string.Empty,
                    EmployeeCode = x.Employee?.EmployeeCode ?? string.Empty,
                    CheckInTime = (DateTime)x.CheckInTime,
                    Latitude = x.CheckInLat,
                    Longitude = x.CheckInLng
                })
                .ToList();

            // Jobs for branch employees
            var jobsByStatus = await _context.Jobs
                .AsNoTracking()
                .Include(x => x.JobStatus)
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.CompletedAt == null &&
                    x.AssignedEmployeeId != null &&
                    branchEmployeeIds.Contains(x.AssignedEmployeeId!.Value))
                .GroupBy(x => new
                {
                    x.JobStatusId,
                    Name = x.JobStatus!.Name,
                    ColorCode = x.JobStatus.ColorCode
                })
                .Select(g => new JobStatusSummaryDto
                {
                    StatusId = g.Key.JobStatusId!.Value,
                    StatusName = g.Key.Name,
                    ColorCode = g.Key.ColorCode ?? "#888888",
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .ToListAsync();

            var totalActiveJobs = jobsByStatus.Sum(x => x.Count);

            // Pending requests for branch employees
            var pendingLeaveCount = await _context.LeaveRequests
                .CountAsync(x => x.CompanyId == companyId
                              && x.Status == RequestStatus.Pending
                              && branchEmployeeIds.Contains(x.EmployeeId));

            var pendingOvertimeCount = await _context.OvertimeRequests
                .CountAsync(x => x.CompanyId == companyId
                              && x.Status == RequestStatus.Pending
                              && branchEmployeeIds.Contains(x.EmployeeId));

            var pendingLeaves = await _context.LeaveRequests
                .AsNoTracking()
                .Include(x => x.Employee)
                .Include(x => x.LeaveType)
                .Where(x => x.CompanyId == companyId
                         && x.Status == RequestStatus.Pending
                         && branchEmployeeIds.Contains(x.EmployeeId))
                .OrderBy(x => x.CreatedAt)
                .Take(5)
                .ToListAsync();

            var pendingOvertimes = await _context.OvertimeRequests
                .AsNoTracking()
                .Include(x => x.Employee)
                .Where(x => x.CompanyId == companyId
                         && x.Status == RequestStatus.Pending
                         && branchEmployeeIds.Contains(x.EmployeeId))
                .OrderBy(x => x.CreatedAt)
                .Take(5)
                .ToListAsync();

            var pendingRequests = pendingLeaves
                .Select(l => new PendingRequestDto
                {
                    Id = l.Id,
                    Type = "Leave",
                    EmployeeName = l.Employee?.FullName ?? string.Empty,
                    EmployeeCode = l.Employee?.EmployeeCode ?? string.Empty,
                    Details = $"{l.LeaveType?.Name}: " +
                                   $"{l.EndDate.DayNumber - l.StartDate.DayNumber + 1} days " +
                                   $"({l.StartDate:dd MMM} – {l.EndDate:dd MMM})",
                    SubmittedAt = l.CreatedAt
                })
                .Concat(pendingOvertimes.Select(o => new PendingRequestDto
                {
                    Id = o.Id,
                    Type = "Overtime",
                    EmployeeName = o.Employee?.FullName ?? string.Empty,
                    EmployeeCode = o.Employee?.EmployeeCode ?? string.Empty,
                    Details = $"Overtime: {o.HoursRequested}h on {o.RequestDate:dd MMM yyyy}",
                    SubmittedAt = o.CreatedAt
                }))
                .OrderBy(x => x.SubmittedAt)
                .Take(10)
                .ToList();

            // Upcoming jobs for branch
            var upcomingJobs = await _context.Jobs
                .AsNoTracking()
                .Include(x => x.AssignedEmployee)
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.CompletedAt == null &&
                    x.ScheduledAt != null &&
                    x.ScheduledAt >= DateTime.UtcNow &&
                    x.ScheduledAt <= in7Days &&
                    x.AssignedEmployeeId != null &&
                    branchEmployeeIds.Contains(x.AssignedEmployeeId!.Value))
                .OrderBy(x => x.ScheduledAt)
                .Take(10)
                .Select(x => new UpcomingJobDto
                {
                    Id = x.Id,
                    JobNumber = x.JobNumber ?? string.Empty,
                    CustomerName = x.CustomerName,
                    Address = x.Address,
                    PriorityLabel = JobPriority.GetLabel(
                        JobPriority.GetValue(x.Priority ?? "Medium")),
                    AssignedEmployeeName = x.AssignedEmployee != null
                        ? x.AssignedEmployee.FullName : null,
                    ScheduledAt = x.ScheduledAt!.Value
                })
                .ToListAsync();

            var dashboard = new SupervisorDashboardDto
            {
                BranchName = branch?.Name ?? string.Empty,
                TotalBranchEmployees = totalBranchEmployees,
                TotalActiveJobs = totalActiveJobs,
                PendingLeaveRequests = pendingLeaveCount,
                PendingOvertimeRequests = pendingOvertimeCount,
                TodayAttendance = attendance,
                JobsByStatus = jobsByStatus,
                PendingRequests = pendingRequests,
                ActiveEmployees = activeEmployees,
                UpcomingJobs = upcomingJobs,
                GeneratedAt = DateTime.UtcNow
            };

            return Ok(dashboard);
        }

        // ════════════════════════════════════════════════════════════════
        // TECHNICIAN DASHBOARD — personal (mobile app home screen)
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<TechnicianDashboardDto>> GetTechnicianDashboardAsync()
        {
            var companyId = _currentUser.CompanyId;
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var in30Days = today.AddDays(30);

            // Resolve employee
            var employee = await _context.Users
                .AsNoTracking()
                .Include(x => x.Employee)
                .Where(x =>
                    x.Id == _currentUser.UserId &&
                    x.CompanyId == companyId &&
                    x.IsActive)
                .Select(x => x.Employee)
                .FirstOrDefaultAsync();

            if (employee == null)
                return Fail<TechnicianDashboardDto>(
                    "No employee profile linked to this account.");

            // Today's attendance
            var todayLog = await _context.AttendanceLogs
                .AsNoTracking()
                .Where(x =>
                    x.EmployeeId == employee.Id &&
                    x.CompanyId == companyId &&
                    x.CheckInTime >= todayStart &&
                    x.CheckInTime < todayEnd)
                .OrderByDescending(x => x.CheckInTime)
                .FirstOrDefaultAsync();

            // My active jobs
            var myJobs = await _context.Jobs
                .AsNoTracking()
                .Include(x => x.JobStatus)
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.AssignedEmployeeId == employee.Id &&
                    x.CompletedAt == null)
                .OrderBy(x => x.Priority)
                .ThenBy(x => x.ScheduledAt)
                .Select(x => new TechnicianJobDto
                {
                    Id = x.Id,
                    JobNumber = x.JobNumber ?? string.Empty,
                    CustomerName = x.CustomerName,
                    Address = x.Address,
                    PriorityLabel = JobPriority.GetLabel(
                        JobPriority.GetValue(x.Priority ?? "Medium")),
                    StatusName = x.JobStatus != null ? x.JobStatus.Name : string.Empty,
                    StatusColor = x.JobStatus != null ? x.JobStatus.ColorCode : null,
                    ScheduledAt = x.ScheduledAt,
                    Latitude = x.Latitude,
                    Longitude = x.Longitude
                })
                .ToListAsync();

            // Pending requests count
            var pendingLeave = await _context.LeaveRequests
                .CountAsync(x =>
                    x.EmployeeId == employee.Id &&
                    x.CompanyId == companyId &&
                    x.Status == RequestStatus.Pending);

            var pendingOvertime = await _context.OvertimeRequests
                .CountAsync(x =>
                    x.EmployeeId == employee.Id &&
                    x.CompanyId == companyId &&
                    x.Status == RequestStatus.Pending);

            // Own document expiry alerts
            var myAlerts = await BuildExpiryAlerts(
                companyId, today, in30Days, employee.Id);

            var dashboard = new TechnicianDashboardDto
            {
                EmployeeName = employee.FullName,
                EmployeeCode = employee.EmployeeCode,

                IsCheckedIn = todayLog != null,
                IsCheckedOut = todayLog?.CheckOutTime != null,
                CheckInTime = todayLog?.CheckInTime,
                CheckOutTime = todayLog?.CheckOutTime,
                AttendanceStatus = todayLog?.Status,

                MyJobs = myJobs,
                PendingLeaveRequests = pendingLeave,
                PendingOvertimeRequests = pendingOvertime,
                MyDocumentAlerts = myAlerts,
                GeneratedAt = DateTime.UtcNow
            };

            return Ok(dashboard);
        }

        // ════════════════════════════════════════════════════════════════
        // PRIVATE HELPERS
        // ════════════════════════════════════════════════════════════════

        private static AttendanceSnapshotDto BuildAttendanceSnapshot(
            List<Domain.Entities.AttendanceLog> logs,
            int totalEmployees,
            DateOnly date)
        {
            return new AttendanceSnapshotDto
            {
                Date = date,
                TotalEmployees = totalEmployees,
                CheckedIn = logs.Count,
                Late = logs.Count(x => x.Status == AttendanceStatus.Late),
                Absent = totalEmployees - logs.Count,
                CheckedOut = logs.Count(x => x.CheckOutTime.HasValue),
                OfflineSynced = logs.Count(x => x.IsOfflineSync)
            };
        }

        private async Task<List<ExpiryAlertDto>> BuildExpiryAlerts(
            Guid companyId, DateOnly today, DateOnly threshold, Guid? employeeId)
        {
            var query = _context.Employees
                .AsNoTracking()
                .Include(x => x.Branch)
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.IsActive &&
                    (
                        (x.VisaExpiryDate != null && x.VisaExpiryDate <= threshold) ||
                        (x.PassportExpiryDate != null && x.PassportExpiryDate <= threshold) ||
                        (x.EmiratesIdExpiryDate != null && x.EmiratesIdExpiryDate <= threshold)
                    ));

            if (employeeId.HasValue)
                query = query.Where(x => x.Id == employeeId.Value);

            var employees = await query.ToListAsync();
            var alerts = new List<ExpiryAlertDto>();

            foreach (var emp in employees)
            {
                if (emp.VisaExpiryDate.HasValue && emp.VisaExpiryDate <= threshold)
                    alerts.Add(new ExpiryAlertDto
                    {
                        EmployeeId = emp.Id,
                        EmployeeName = emp.FullName,
                        EmployeeCode = emp.EmployeeCode,
                        DocumentType = "Visa",
                        ExpiryDate = emp.VisaExpiryDate.Value,
                        DaysLeft = emp.VisaExpiryDate.Value.DayNumber - today.DayNumber
                    });

                if (emp.PassportExpiryDate.HasValue && emp.PassportExpiryDate <= threshold)
                    alerts.Add(new ExpiryAlertDto
                    {
                        EmployeeId = emp.Id,
                        EmployeeName = emp.FullName,
                        EmployeeCode = emp.EmployeeCode,
                        DocumentType = "Passport",
                        ExpiryDate = emp.PassportExpiryDate.Value,
                        DaysLeft = emp.PassportExpiryDate.Value.DayNumber - today.DayNumber
                    });

                if (emp.EmiratesIdExpiryDate.HasValue && emp.EmiratesIdExpiryDate <= threshold)
                    alerts.Add(new ExpiryAlertDto
                    {
                        EmployeeId = emp.Id,
                        EmployeeName = emp.FullName,
                        EmployeeCode = emp.EmployeeCode,
                        DocumentType = "EmiratesId",
                        ExpiryDate = emp.EmiratesIdExpiryDate.Value,
                        DaysLeft = emp.EmiratesIdExpiryDate.Value.DayNumber - today.DayNumber
                    });
            }

            return alerts.OrderBy(x => x.DaysLeft).ToList();
        }

        private static ApiResponse<T> Ok<T>(T data) => new()
        { Success = true, Data = data, Message = string.Empty, Errors = null };

        private static ApiResponse<T> Fail<T>(string message) => new()
        { Success = false, Data = default, Message = message, Errors = null };
    }
}
