using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Attendance;
using ServicePilot.Application.Interfaces.Repositories;
using ServicePilot.Domain.Constants;
using ServicePilot.Domain.Entities;
using ServicePilot.Infrastructure.Persistence.Models;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Infrastructure.Repositories
{
    public class AttendanceRepository : IAttendanceRepository
    {

        private readonly AppDbContext _context;

        public AttendanceRepository(AppDbContext context)
        {
            _context = context;
        }
        public async Task AddAsync(AttendanceLog log)
        {
            await _context.AttendanceLogs.AddAsync(log);
        }

        public async Task<AttendanceLog?> GetByIdAsync(Guid id, Guid companyId)
        {
            return await _context.AttendanceLogs
                    .AsNoTracking()
                    .Include(x => x.Employee)
                    .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId);
        }

        /// <summary>
        /// Finds today's open check-in (no checkout yet) for an employee.
        /// Uses UTC date — see future improvement note about timezone handling.
        /// </summary>
        public async Task<AttendanceLog?> GetOpenCheckInAsync(Guid employeeId, Guid companyId)
        {
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var today = DateTime.UtcNow.Date;
            return await _context.AttendanceLogs
                .FirstOrDefaultAsync(x =>
                    x.EmployeeId == employeeId &&
                    x.CompanyId == companyId &&
                    x.CheckInTime >= todayStart &&
                    x.CheckInTime < todayEnd &&
                    x.CheckOutTime == null);
        }

        public async Task<PagedResult<AttendanceLog>> GetPagedAsync(Guid companyId, PagedAttendanceRequest filter)
        {
            var query = _context.AttendanceLogs
              .AsNoTracking()
              .Include(x => x.Employee)
                  .ThenInclude(e => e.Branch)
              .Where(x => x.CompanyId == companyId);

            // ── Filters ──────────────────────────────────────────────────
            if (filter.EmployeeId.HasValue)
                query = query.Where(x => x.EmployeeId == filter.EmployeeId);

            if (filter.BranchId.HasValue)
                query = query.Where(x => x.Employee.BranchId == filter.BranchId);

            if (filter.DepartmentId.HasValue)
                query = query.Where(x => x.Employee.DepartmentId == filter.DepartmentId);

            if (!string.IsNullOrWhiteSpace(filter.Status))
                query = query.Where(x => x.Status.ToLower() == filter.Status.ToLower());

            if (filter.DateFrom.HasValue)
            {
                var from = filter.DateFrom.Value.ToDateTime(TimeOnly.MinValue);
                query = query.Where(x => x.CheckInTime >= from);
            }

            if (filter.DateTo.HasValue)
            {
                var to = filter.DateTo.Value.ToDateTime(TimeOnly.MaxValue);
                query = query.Where(x => x.CheckInTime <= to);
            }

            var totalCount = await query.CountAsync();

            // ── Sort ─────────────────────────────────────────────────────
            query = (filter.SortBy?.ToLower(), filter.SortDir?.ToLower()) switch
            {
                ("checkintime", "asc") => query.OrderBy(x => x.CheckInTime),
                ("checkintime", _) => query.OrderByDescending(x => x.CheckInTime),
                ("checkouttime", "asc") => query.OrderBy(x => x.CheckOutTime),
                ("checkouttime", _) => query.OrderByDescending(x => x.CheckOutTime),
                ("status", "asc") => query.OrderBy(x => x.Status),
                ("status", _) => query.OrderByDescending(x => x.Status),
                _ => query.OrderByDescending(x => x.CheckInTime)
            };

            var items = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            return new PagedResult<AttendanceLog>
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize
            };
        }

        /// <summary>
        /// Aggregated summary per employee for a date range.
        /// Loaded into memory for grouping — EF cannot translate all time math to SQL.
        /// </summary>
        public async Task<IEnumerable<AttendanceSummaryDto>> GetSummaryAsync(Guid companyId, DateOnly from, DateOnly to, Guid? branchId, Guid? departmentId)
        {
            var fromDt = from.ToDateTime(TimeOnly.MinValue);
            var toDt = to.ToDateTime(TimeOnly.MaxValue);

            var query = _context.AttendanceLogs
                .AsNoTracking()
                .Include(x => x.Employee).ThenInclude(e => e.Branch)
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.CheckInTime >= fromDt &&
                    x.CheckInTime <= toDt);

            if (branchId.HasValue)
                query = query.Where(x => x.Employee.BranchId == branchId);

            if (departmentId.HasValue)
                query = query.Where(x => x.Employee.DepartmentId == departmentId);

            var rawLogs = await query.ToListAsync();

            return rawLogs
                .GroupBy(x => new
                {
                    x.EmployeeId,
                    EmployeeName = x.Employee.FullName,
                    EmployeeCode = x.Employee.EmployeeCode,
                    BranchName = x.Employee.Branch?.Name
                })
                .Select(g =>
                {
                    var totalHours = g
                        .Where(x => x.CheckOutTime.HasValue)
                        .Sum(x => (x.CheckOutTime!.Value - x.CheckInTime!.Value).TotalHours);

                    var checkInTimes = g
                        .Where(x => x.Status.ToLower() != AttendanceStatus.Absent.ToLower())
                        .Select(x => x.CheckInTime!.Value.TimeOfDay)
                        .ToList();

                    string? avgCheckIn = null;
                    if (checkInTimes.Any())
                    {
                        var avgTicks = (long)checkInTimes.Average(t => t.Ticks);
                        avgCheckIn = TimeSpan.FromTicks(avgTicks).ToString(@"hh\:mm");
                    }

                    return new AttendanceSummaryDto
                    {
                        EmployeeId = g.Key.EmployeeId,
                        EmployeeName = g.Key.EmployeeName,
                        EmployeeCode = g.Key.EmployeeCode,
                        BranchName = g.Key.BranchName,
                        TotalDays = g.Count(),
                        PresentDays = g.Count(x => x.Status.ToLower() == AttendanceStatus.Present.ToLower()),
                        LateDays = g.Count(x => x.Status.ToLower() == AttendanceStatus.Late.ToLower()),
                        AbsentDays = g.Count(x => x.Status.ToLower() == AttendanceStatus.Absent.ToLower()),
                        TotalHoursWorked = Math.Round(totalHours, 2),
                        AverageCheckIn = avgCheckIn
                    };
                })
                .OrderBy(x => x.EmployeeName)
                .ToList();
        }

        /// <summary>
        /// All today's attendance records for dashboard — includes Employee nav property.
        /// </summary>
        public async Task<IEnumerable<AttendanceLog>> GetTodayAsync(Guid companyId)
        {
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);
            var today = DateTime.UtcNow.Date;
            return await _context.AttendanceLogs
                .AsNoTracking()
                .Include(x => x.Employee)
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.CheckInTime >= todayStart &&
                    x.CheckInTime < todayEnd)
                .OrderByDescending(x => x.CheckInTime)
                .ToListAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        public void Update(AttendanceLog log)
        {
            _context.AttendanceLogs.Update(log);
        }
    }
}
