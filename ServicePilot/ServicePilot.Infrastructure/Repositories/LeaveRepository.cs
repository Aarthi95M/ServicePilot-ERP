using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Leave;
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
    public class LeaveRepository : ILeaveRepository
    {
        private readonly AppDbContext _context;

        public LeaveRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<LeaveRequest?> GetByIdAsync(Guid id, Guid companyId)
        {
            return await _context.LeaveRequests
                .AsNoTracking()
                .Include(x => x.Employee)
                .Include(x => x.LeaveType)
                .Include(x => x.ApprovedByNavigation)
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == companyId);
        }

        public async Task<PagedResult<LeaveRequest>> GetPagedAsync(
            Guid companyId, PagedLeaveRequest filter, Guid? excludeEmployeeId = null)
        {
            var query = _context.LeaveRequests
                .AsNoTracking()
                .Include(x => x.Employee)
                .Include(x => x.LeaveType)
                .Include(x => x.ApprovedByNavigation)
                .Where(x => x.CompanyId == companyId);

            // Exclude a specific employee's own requests (e.g. a Supervisor's
            // approval queue must never include their own leave requests).
            if (excludeEmployeeId.HasValue)
                query = query.Where(x => x.EmployeeId != excludeEmployeeId.Value);

            // ── Filters ──────────────────────────────────────────────
            if (filter.EmployeeId.HasValue)
                query = query.Where(x => x.EmployeeId == filter.EmployeeId);

            if (filter.LeaveTypeId.HasValue)
                query = query.Where(x => x.LeaveTypeId == filter.LeaveTypeId);

            if (!string.IsNullOrWhiteSpace(filter.Status))
                query = query.Where(x => x.Status == filter.Status);

            if (filter.DateFrom.HasValue)
                query = query.Where(x => x.StartDate >= filter.DateFrom);

            if (filter.DateTo.HasValue)
                query = query.Where(x => x.EndDate <= filter.DateTo);

            var totalCount = await query.CountAsync();

            // ── Sort ─────────────────────────────────────────────────
            query = (filter.SortBy?.ToLower(), filter.SortDir?.ToLower()) switch
            {
                ("startdate", "asc") => query.OrderBy(x => x.StartDate),
                ("startdate", _) => query.OrderByDescending(x => x.StartDate),
                ("createdat", "asc") => query.OrderBy(x => x.CreatedAt),
                ("createdat", _) => query.OrderByDescending(x => x.CreatedAt),
                ("status", "asc") => query.OrderBy(x => x.Status),
                ("status", _) => query.OrderByDescending(x => x.Status),
                _ => query.OrderByDescending(x => x.CreatedAt)
            };

            var items = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            return new PagedResult<LeaveRequest>
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize
            };
        }

        public async Task<IEnumerable<LeaveRequest>> GetByEmployeeAsync(
            Guid employeeId, Guid companyId)
        {
            return await _context.LeaveRequests
                .AsNoTracking()
                .Include(x => x.LeaveType)
                .Include(x => x.ApprovedByNavigation)
                .Where(x =>
                    x.EmployeeId == employeeId &&
                    x.CompanyId == companyId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> HasOverlappingLeaveAsync(
            Guid employeeId, Guid companyId,
            DateOnly startDate, DateOnly endDate,
            Guid? excludeId = null)
        {
            var query = _context.LeaveRequests
                .Where(x =>
                    x.EmployeeId == employeeId &&
                    x.CompanyId == companyId &&
                    x.Status != RequestStatus.Rejected &&
                    x.Status != RequestStatus.Cancelled &&
                    x.StartDate <= endDate &&
                    x.EndDate >= startDate);

            if (excludeId.HasValue)
                query = query.Where(x => x.Id != excludeId.Value);

            return await query.AnyAsync();
        }

        public async Task<int> GetApprovedDaysAsync(
            Guid employeeId, Guid leaveTypeId, int year)
        {
            var yearStart = new DateOnly(year, 1, 1);
            var yearEnd = new DateOnly(year, 12, 31);

            var approvedLeaves = await _context.LeaveRequests
                .AsNoTracking()
                .Where(x =>
                    x.EmployeeId == employeeId &&
                    x.LeaveTypeId == leaveTypeId &&
                    x.Status == RequestStatus.Approved &&
                    x.StartDate >= yearStart &&
                    x.EndDate <= yearEnd)
                .ToListAsync();

            return approvedLeaves.Sum(x =>
                x.EndDate.DayNumber - x.StartDate.DayNumber + 1);
        }

        public async Task<LeaveType?> GetLeaveTypeAsync(
            Guid leaveTypeId, Guid companyId)
        {
            return await _context.LeaveTypes
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Id == leaveTypeId &&
                    x.CompanyId == companyId &&
                    x.IsActive);
        }

        public async Task<IEnumerable<LeaveSummaryDto>> GetSummaryAsync(
            Guid companyId, int year,
            Guid? employeeId, Guid? departmentId)
        {
            var yearStart = new DateOnly(year, 1, 1);
            var yearEnd = new DateOnly(year, 12, 31);

            var employeeQuery = _context.Employees
                .AsNoTracking()
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.IsActive &&
                    // Only include employees who had joined by the requested year
                    (!x.JoiningDate.HasValue || x.JoiningDate.Value.Year <= year));

            if (employeeId.HasValue)
                employeeQuery = employeeQuery.Where(x => x.Id == employeeId);

            if (departmentId.HasValue)
                employeeQuery = employeeQuery.Where(x => x.DepartmentId == departmentId);

            var employees = await employeeQuery.ToListAsync();

            var leaveTypes = await _context.LeaveTypes
                .AsNoTracking()
                .Where(x => x.CompanyId == companyId && x.IsActive)
                .ToListAsync();

            var allLeaves = await _context.LeaveRequests
                .AsNoTracking()
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.StartDate >= yearStart &&
                    x.EndDate <= yearEnd &&
                    (x.Status == RequestStatus.Approved ||
                     x.Status == RequestStatus.Pending) &&
                    (!employeeId.HasValue || x.EmployeeId == employeeId))
                .ToListAsync();

            return employees.Select(emp =>
            {
                var empLeaves = allLeaves.Where(l => l.EmployeeId == emp.Id).ToList();

                var balances = leaveTypes.Select(lt =>
                {
                    // ── Prorate entitlement if employee joined during this year ──
                    int entitledDays = lt.MaxDaysPerYear;
                    if (emp.JoiningDate.HasValue && emp.JoiningDate.Value.Year == year)
                    {
                        var joinDayNum   = emp.JoiningDate.Value.DayNumber;
                        var yearEndDay   = yearEnd.DayNumber;
                        var yearStartDay = yearStart.DayNumber;
                        int daysFromJoin = yearEndDay - joinDayNum + 1;
                        int daysInYear   = yearEndDay - yearStartDay + 1;   // 365 or 366
                        entitledDays = (int)Math.Ceiling(
                            lt.MaxDaysPerYear * (double)daysFromJoin / daysInYear);
                    }
                    // ─────────────────────────────────────────────────────────────

                    var taken = empLeaves
                        .Where(l => l.LeaveTypeId == lt.Id && l.Status == RequestStatus.Approved)
                        .Sum(l => l.EndDate.DayNumber - l.StartDate.DayNumber + 1);

                    var pending = empLeaves
                        .Where(l => l.LeaveTypeId == lt.Id && l.Status == RequestStatus.Pending)
                        .Sum(l => l.EndDate.DayNumber - l.StartDate.DayNumber + 1);

                    return new LeaveTypeBalance
                    {
                        LeaveTypeId    = lt.Id,
                        LeaveTypeName  = lt.Name,
                        IsPaid         = lt.IsPaid,
                        MaxDaysPerYear = entitledDays,                          // prorated
                        DaysTaken      = taken,
                        DaysPending    = pending,
                        DaysRemaining  = Math.Max(0, entitledDays - taken)
                    };
                }).ToList();

                return new LeaveSummaryDto
                {
                    EmployeeId = emp.Id,
                    EmployeeName = emp.FullName,
                    EmployeeCode = emp.EmployeeCode,
                    Balances = balances
                };
            }).ToList();
        }

        public async Task AddAsync(LeaveRequest request)
            => await _context.LeaveRequests.AddAsync(request);

        public void Update(LeaveRequest request)
            => _context.LeaveRequests.Update(request);

        public async Task SaveChangesAsync()
            => await _context.SaveChangesAsync();
    }
}
