using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using ServicePilot.Application.DTOs.Lookup;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Infrastructure.Persistence.Models;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace ServicePilot.Infrastructure.Services
{
    public class LookupService : ILookupService
    {

        private readonly AppDbContext _context;

        private readonly IDistributedCache _distributedCache;

        private readonly ICurrentUserService _currentUserService;

        public LookupService(AppDbContext context, IDistributedCache distributedCache, ICurrentUserService currentUserService)
        {
            _context = context;
            _distributedCache = distributedCache;
            _currentUserService = currentUserService;
        }
        public async Task<ApiResponse<List<BranchDropdownDto>>> GetBranchesAsync()
        {
            var cacheKey = $"branch_dropdown_{_currentUserService.CompanyId}";

            var cache = await _distributedCache.GetStringAsync(cacheKey);

            if (cache != null)
            {
                return new ApiResponse<List<BranchDropdownDto>> { 
                    Data = JsonSerializer.Deserialize<List<BranchDropdownDto>>(cache),
                    Success = true

                };
            }

            var employees = await _context.Branches
                .AsNoTracking()
                .Where(x => x.IsActive && x.CompanyId == _currentUserService.CompanyId)
                .OrderBy(x => x.Name)
                .Select(x => new BranchDropdownDto
                {
                    Id = x.Id,
                    Label = x.Name
                }).ToListAsync();

            await _distributedCache.SetStringAsync(cacheKey, JsonSerializer.Serialize(employees),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                });

            return new ApiResponse<List<BranchDropdownDto>>
            {
                Data = employees,
                Success = true,
            };
        }

        public async Task<ApiResponse<List<DepartmentDropdownDto>>> GetDepartmentsAsync()
        {
            var cacheKey = $"department_dropdown_{_currentUserService.CompanyId}";

            var cache = await _distributedCache.GetStringAsync(cacheKey) ;

            if (cache != null)
            {
                return new ApiResponse<List<DepartmentDropdownDto>>
                {
                    Data = JsonSerializer.Deserialize<List<DepartmentDropdownDto>>(cache),
                    Success = true
                };
            }

            var employees = await _context.Departments
                .AsNoTracking()
                .Where(x => x.IsActive && x.CompanyId == _currentUserService.CompanyId)
                .OrderBy(x => x.Name)
                .Select(x => new DepartmentDropdownDto
                {

                    Id = x.Id,
                    Label = x.Name,
                }).ToListAsync();

            await _distributedCache.SetStringAsync(cacheKey,
                JsonSerializer.Serialize(employees),
                new DistributedCacheEntryOptions()
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                });

            return new ApiResponse<List<DepartmentDropdownDto>>
            {
                Data = employees,
                Success = true
            };

        }

        public async Task<ApiResponse<List<EmployeeDropdownDto>>> GetEmployeesAsync()
        {
            var cacheKey = $"employees_dropdown_{_currentUserService.CompanyId}";

            var cached = await _distributedCache.GetStringAsync(cacheKey);

            if (cached != null)
            {
                return new ApiResponse<List<EmployeeDropdownDto>>
                {
                    Success = true,
                    Data = JsonSerializer.Deserialize<List<EmployeeDropdownDto>>(cached)
                };
            }

            var employees = await _context.Employees
                .AsNoTracking()
                .Where(x =>
                    x.CompanyId == _currentUserService.CompanyId &&
                    x.IsActive)
                .OrderBy(x => x.FullName)
                .Select(x => new EmployeeDropdownDto
                {
                    Id = x.Id,
                    Label = x.EmployeeCode + " - " + x.FullName
                })
                .ToListAsync();

            await _distributedCache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(employees),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                });

            return new ApiResponse<List<EmployeeDropdownDto>>
            {
                Success = true,
                Data = employees
            };
        }

        public async Task<ApiResponse<List<PositionDropdownDto>>> GetPositionsAsync()
        {
            var cacheKey = $"positions_dropdown_{_currentUserService.CompanyId}";

            var cached = await _distributedCache.GetStringAsync(cacheKey);

            if (cached != null)
            {
                return new ApiResponse<List<PositionDropdownDto>>
                {
                    Success = true,
                    Data = JsonSerializer.Deserialize<List<PositionDropdownDto>>(cached)
                };
            }

            var positions = await _context.Positions
                .AsNoTracking()
                .Where(x =>
                    x.CompanyId == _currentUserService.CompanyId &&
                    x.IsActive)
                .OrderBy(x => x.Name)
                .Select(x => new PositionDropdownDto
                {
                    Id = x.Id,
                    Label = x.Name
                })
                .ToListAsync();

            await _distributedCache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(positions),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                });

            return new ApiResponse<List<PositionDropdownDto>>
            {
                Success = true,
                Data = positions
            };
        }
    }
}
