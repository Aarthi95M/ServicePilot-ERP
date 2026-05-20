using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Overtime;
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
    public class OvertimeRepository : IOvertimeRepository
    {
        private readonly AppDbContext _context;

        public OvertimeRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<OvertimeRequest?> GetByIdAsync(Guid id, Guid companyId)
        {
            return await _context.OvertimeRequests
                .AsNoTracking()
                .Include(x => x.Employee)
                .Include(x => x.ApprovedByNavigation)
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == companyId);
        }

        public async Task<PagedResult<OvertimeRequest>> GetPagedAsync(
            Guid companyId, PagedOvertimeRequest filter)
        {
            var query = _context.OvertimeRequests
                .AsNoTracking()
                .Include(x => x.Employee)
                .Include(x => x.ApprovedByNavigation)
                .Where(x => x.CompanyId == companyId);

            if (filter.EmployeeId.HasValue)
                query = query.Where(x => x.EmployeeId == filter.EmployeeId);

            if (!string.IsNullOrWhiteSpace(filter.Status))
                query = query.Where(x => x.Status == filter.Status);

            if (filter.DateFrom.HasValue)
                query = query.Where(x => x.RequestDate >= filter.DateFrom);

            if (filter.DateTo.HasValue)
                query = query.Where(x => x.RequestDate <= filter.DateTo);

            var totalCount = await query.CountAsync();

            query = (filter.SortBy?.ToLower(), filter.SortDir?.ToLower()) switch
            {
                ("requestdate", "asc") => query.OrderBy(x => x.RequestDate),
                ("requestdate", _) => query.OrderByDescending(x => x.RequestDate),
                ("createdat", "asc") => query.OrderBy(x => x.CreatedAt),
                ("createdat", _) => query.OrderByDescending(x => x.CreatedAt),
                ("status", "asc") => query.OrderBy(x => x.Status),
                ("status", _) => query.OrderByDescending(x => x.Status),
                _ => query.OrderByDescending(x => x.RequestDate)
            };

            var items = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            return new PagedResult<OvertimeRequest>
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize
            };
        }

        public async Task<IEnumerable<OvertimeRequest>> GetByEmployeeAsync(
            Guid employeeId, Guid companyId)
        {
            return await _context.OvertimeRequests
                .AsNoTracking()
                .Include(x => x.ApprovedByNavigation)
                .Where(x =>
                    x.EmployeeId == employeeId &&
                    x.CompanyId == companyId)
                .OrderByDescending(x => x.RequestDate)
                .ToListAsync();
        }

        public async Task<bool> HasExistingRequestAsync(
            Guid employeeId, Guid companyId,
            DateOnly requestDate, Guid? excludeId = null)
        {
            var query = _context.OvertimeRequests
                .Where(x =>
                    x.EmployeeId == employeeId &&
                    x.CompanyId == companyId &&
                    x.RequestDate == requestDate &&
                    x.Status != RequestStatus.Rejected &&
                    x.Status != RequestStatus.Cancelled);

            if (excludeId.HasValue)
                query = query.Where(x => x.Id != excludeId.Value);

            return await query.AnyAsync();
        }

        public async Task AddAsync(OvertimeRequest request)
            => await _context.OvertimeRequests.AddAsync(request);

        public void Update(OvertimeRequest request)
            => _context.OvertimeRequests.Update(request);

        public async Task SaveChangesAsync()
            => await _context.SaveChangesAsync();
    }
}
