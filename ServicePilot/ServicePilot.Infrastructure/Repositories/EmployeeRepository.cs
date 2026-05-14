using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Employees;
using ServicePilot.Application.Interfaces.Repositories;
using ServicePilot.Application.Interfaces.Services;
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
    public class EmployeeRepository : IEmployeeRepository
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public EmployeeRepository(AppDbContext context,
            ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<IEnumerable<Employee>> GetAllAsync(
            Guid companyId,
           EmployeeFilterDto filter)
        {
            var query = _context.Employees
                .Where(x => x.CompanyId == companyId);

            if (_currentUser.Role == "Supervisor")
            {
                query = query.Where(x =>
                    x.BranchId == _currentUser.BranchId);
            }

            if (filter.BranchId.HasValue)
                query = query.Where(x => x.BranchId == filter.BranchId);

            if (filter.DepartmentId.HasValue)
                query = query.Where(x => x.DepartmentId == filter.DepartmentId);

            if (filter.PositionId.HasValue)
                query = query.Where(x => x.PositionId == filter.PositionId);

            if (filter.IsActive.HasValue)
                query = query.Where(x => x.IsActive == filter.IsActive);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                query = query.Where(x =>
                    x.FullName.Contains(filter.Search) ||
                    x.EmployeeCode.Contains(filter.Search) ||
                    x.Email.Contains(filter.Search));
            }

            return await query
                .OrderBy(x => x.FullName)
                .ToListAsync();
        }

        public async Task<Employee?> GetByIdAsync(Guid id, Guid companyId)
        {
            return await _context.Employees
                .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId);
        }

        public async Task AddAsync(Employee employee)
        {
            await _context.Employees.AddAsync(employee);
        }

        public void Update(Employee employee)
        {
            _context.Employees.Update(employee);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        public async Task<Employee?> GetByIdWithTrackingAsync(Guid id)
        {
            return await _context.Employees
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<PagedResult<EmployeeDto>> GetPagedAsync(Guid companyId, PagedEmployeeRequest filter)
        {
            var query = _context.Employees
         .AsNoTracking() // 🚀 PERFORMANCE BOOST
         .Where(x => x.CompanyId == companyId);

            if (filter.BranchId.HasValue)
                query = query.Where(x => x.BranchId == filter.BranchId);

            if (filter.DepartmentId.HasValue)
                query = query.Where(x => x.DepartmentId == filter.DepartmentId);

            if (filter.IsActive.HasValue)
                query = query.Where(x => x.IsActive == filter.IsActive);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                query = query.Where(x =>
                    x.FullName.Contains(filter.Search) ||
                    x.EmployeeCode.Contains(filter.Search) ||
                    x.Email.Contains(filter.Search));
            }

            var totalCount = await query.CountAsync();

            query = (filter.SortBy?.ToLower(), filter.SortDir?.ToLower()) switch
            {
                ("fullname", "desc") => query.OrderByDescending(x => x.FullName),
                ("fullname", _) => query.OrderBy(x => x.FullName),

                ("employeecode", "desc") => query.OrderByDescending(x => x.EmployeeCode),
                ("employeecode", _) => query.OrderBy(x => x.EmployeeCode),

                ("createdat", "desc") => query.OrderByDescending(x => x.CreatedAt),
                ("createdat", _) => query.OrderBy(x => x.CreatedAt),

                _ => query.OrderBy(x => x.FullName)
            };

            var items = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(x => new EmployeeDto
            {
                Id= x.Id,
                EmployeeCode = x.EmployeeCode,
                FullName = x.FullName,
                Email = x.Email,
                Phone = x.PhoneNumber,
                IsActive = x.IsActive,
            })
            .ToListAsync();

            return new PagedResult<EmployeeDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize
            };
        }

    
    }
}
