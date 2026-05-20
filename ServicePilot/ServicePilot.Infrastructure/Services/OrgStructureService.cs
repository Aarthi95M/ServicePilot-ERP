using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.OrgStructure;
using ServicePilot.Application.Interfaces.Services;
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
    public class OrgStructureService : IOrgStructureService
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public OrgStructureService(
            AppDbContext context,
            ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        // ════════════════════════════════════════════════════════════════
        // BRANCHES
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<IEnumerable<BranchDto>>> GetBranchesAsync()
        {
            var branches = await _context.Branches
                .AsNoTracking()
                .Where(x => x.CompanyId == _currentUser.CompanyId)
                .OrderBy(x => x.Name)
                .ToListAsync();

            var empCounts = await _context.Employees
                .Where(x => x.CompanyId == _currentUser.CompanyId && x.IsActive)
                .GroupBy(x => x.BranchId)
                .Select(g => new { BranchId = g.Key, Count = g.Count() })
                .ToListAsync();

            var result = branches.Select(b => new BranchDto
            {
                Id = b.Id,
                Name = b.Name,
                Address = b.Address,
                Latitude = b.Latitude,
                Longitude = b.Longitude,
                IsActive = b.IsActive,
                EmployeeCount = empCounts.FirstOrDefault(e => e.BranchId == b.Id)?.Count ?? 0,
                CreatedAt = b.CreatedAt
            });

            return Ok(result);
        }

        public async Task<ApiResponse<BranchDto>> GetBranchByIdAsync(Guid id)
        {
            var b = await _context.Branches
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == _currentUser.CompanyId);

            if (b == null) return Fail<BranchDto>("Branch not found.");

            var empCount = await _context.Employees
                .CountAsync(x =>
                    x.BranchId == id &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

            return Ok(new BranchDto
            {
                Id = b.Id,
                Name = b.Name,
                Address = b.Address,
                Latitude = b.Latitude,
                Longitude = b.Longitude,
                IsActive = b.IsActive,
                EmployeeCount = empCount,
                CreatedAt = b.CreatedAt
            });
        }

        public async Task<ApiResponse<BranchDto>> CreateBranchAsync(CreateBranchDto dto)
        {
            // Name must be unique within company
            var exists = await _context.Branches.AnyAsync(x =>
                x.CompanyId == _currentUser.CompanyId &&
                x.Name == dto.Name.Trim());

            if (exists)
                return Fail<BranchDto>("A branch with this name already exists.");

            var branch = new Branch
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.CompanyId,
                Name = dto.Name.Trim(),
                Address = dto.Address,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Branches.AddAsync(branch);
            await _context.SaveChangesAsync();

            return await GetBranchByIdAsync(branch.Id);
        }

        public async Task<ApiResponse<BranchDto>> UpdateBranchAsync(
            Guid id, UpdateBranchDto dto)
        {
            var branch = await _context.Branches
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == _currentUser.CompanyId);

            if (branch == null) return Fail<BranchDto>("Branch not found.");

            // Name uniqueness — exclude self
            var nameConflict = await _context.Branches.AnyAsync(x =>
                x.CompanyId == _currentUser.CompanyId &&
                x.Name == dto.Name.Trim() &&
                x.Id != id);

            if (nameConflict)
                return Fail<BranchDto>("Another branch with this name already exists.");

            branch.Name = dto.Name.Trim();
            branch.Address = dto.Address;
            branch.Latitude = dto.Latitude;
            branch.Longitude = dto.Longitude;
            branch.IsActive = dto.IsActive;
            branch.UpdatedAt = DateTime.UtcNow;

            _context.Branches.Update(branch);
            await _context.SaveChangesAsync();

            return await GetBranchByIdAsync(id);
        }

        public async Task<ApiResponse<bool>> DeactivateBranchAsync(Guid id)
        {
            var branch = await _context.Branches
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == _currentUser.CompanyId);

            if (branch == null) return Fail<bool>("Branch not found.");

            // Warn if employees still assigned
            var empCount = await _context.Employees
                .CountAsync(x =>
                    x.BranchId == id &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

            if (empCount > 0)
                return Fail<bool>(
                    $"Cannot deactivate branch — {empCount} active employee(s) are still assigned to it.");

            branch.IsActive = false;
            branch.UpdatedAt = DateTime.UtcNow;

            _context.Branches.Update(branch);
            await _context.SaveChangesAsync();

            return Ok(true);
        }

        // ════════════════════════════════════════════════════════════════
        // DEPARTMENTS
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<IEnumerable<DepartmentDto>>> GetDepartmentsAsync()
        {
            var depts = await _context.Departments
                .AsNoTracking()
                .Where(x => x.CompanyId == _currentUser.CompanyId)
                .OrderBy(x => x.Name)
                .ToListAsync();

            var empCounts = await _context.Employees
                .Where(x => x.CompanyId == _currentUser.CompanyId && x.IsActive)
                .GroupBy(x => x.DepartmentId)
                .Select(g => new { DeptId = g.Key, Count = g.Count() })
                .ToListAsync();

            return Ok(depts.Select(d => new DepartmentDto
            {
                Id = d.Id,
                Name = d.Name,
                IsActive = d.IsActive,
                EmployeeCount = empCounts.FirstOrDefault(e => e.DeptId == d.Id)?.Count ?? 0,
                CreatedAt = d.CreatedAt
            }));
        }

        public async Task<ApiResponse<DepartmentDto>> CreateDepartmentAsync(
            CreateDepartmentDto dto)
        {
            var exists = await _context.Departments.AnyAsync(x =>
                x.CompanyId == _currentUser.CompanyId &&
                x.Name == dto.Name.Trim());

            if (exists)
                return Fail<DepartmentDto>("A department with this name already exists.");

            var dept = new Department
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.CompanyId,
                Name = dto.Name.Trim(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Departments.AddAsync(dept);
            await _context.SaveChangesAsync();

            return Ok(new DepartmentDto
            {
                Id = dept.Id,
                Name = dept.Name,
                IsActive = dept.IsActive,
                EmployeeCount = 0,
                CreatedAt = dept.CreatedAt
            });
        }

        public async Task<ApiResponse<DepartmentDto>> UpdateDepartmentAsync(
            Guid id, UpdateDepartmentDto dto)
        {
            var dept = await _context.Departments
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == _currentUser.CompanyId);

            if (dept == null) return Fail<DepartmentDto>("Department not found.");

            var nameConflict = await _context.Departments.AnyAsync(x =>
                x.CompanyId == _currentUser.CompanyId &&
                x.Name == dto.Name.Trim() &&
                x.Id != id);

            if (nameConflict)
                return Fail<DepartmentDto>("Another department with this name already exists.");

            dept.Name = dto.Name.Trim();
            dept.IsActive = dto.IsActive;
            dept.UpdatedAt = DateTime.UtcNow;

            _context.Departments.Update(dept);
            await _context.SaveChangesAsync();

            var empCount = await _context.Employees
                .CountAsync(x =>
                    x.DepartmentId == id &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

            return Ok(new DepartmentDto
            {
                Id = dept.Id,
                Name = dept.Name,
                IsActive = dept.IsActive,
                EmployeeCount = empCount,
                CreatedAt = dept.CreatedAt
            });
        }

        public async Task<ApiResponse<bool>> DeactivateDepartmentAsync(Guid id)
        {
            var dept = await _context.Departments
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == _currentUser.CompanyId);

            if (dept == null) return Fail<bool>("Department not found.");

            var empCount = await _context.Employees
                .CountAsync(x =>
                    x.DepartmentId == id &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

            if (empCount > 0)
                return Fail<bool>(
                    $"Cannot deactivate department — {empCount} active employee(s) are assigned to it.");

            dept.IsActive = false;
            dept.UpdatedAt = DateTime.UtcNow;

            _context.Departments.Update(dept);
            await _context.SaveChangesAsync();

            return Ok(true);
        }

        // ════════════════════════════════════════════════════════════════
        // POSITIONS
        // ════════════════════════════════════════════════════════════════

        public async Task<ApiResponse<IEnumerable<PositionDto>>> GetPositionsAsync()
        {
            var positions = await _context.Positions
                .AsNoTracking()
                .Where(x => x.CompanyId == _currentUser.CompanyId)
                .OrderBy(x => x.Name)
                .ToListAsync();

            var empCounts = await _context.Employees
                .Where(x => x.CompanyId == _currentUser.CompanyId && x.IsActive)
                .GroupBy(x => x.PositionId)
                .Select(g => new { PosId = g.Key, Count = g.Count() })
                .ToListAsync();

            return Ok(positions.Select(pos => new PositionDto
            {
                Id = pos.Id,
                Name = pos.Name,
                Description = pos.Description,
                IsActive = pos.IsActive,
                EmployeeCount = empCounts.FirstOrDefault(e => e.PosId == pos.Id)?.Count ?? 0,
                CreatedAt = pos.CreatedAt
            }));
        }

        public async Task<ApiResponse<PositionDto>> CreatePositionAsync(CreatePositionDto dto)
        {
            var exists = await _context.Positions.AnyAsync(x =>
                x.CompanyId == _currentUser.CompanyId &&
                x.Name == dto.Name.Trim());

            if (exists)
                return Fail<PositionDto>("A position with this name already exists.");

            var pos = new Position
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.CompanyId,
                Name = dto.Name.Trim(),
                Description = dto.Description,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Positions.AddAsync(pos);
            await _context.SaveChangesAsync();

            return Ok(new PositionDto
            {
                Id = pos.Id,
                Name = pos.Name,
                Description = pos.Description,
                IsActive = pos.IsActive,
                EmployeeCount = 0,
                CreatedAt = pos.CreatedAt
            });
        }

        public async Task<ApiResponse<PositionDto>> UpdatePositionAsync(
            Guid id, UpdatePositionDto dto)
        {
            var pos = await _context.Positions
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == _currentUser.CompanyId);

            if (pos == null) return Fail<PositionDto>("Position not found.");

            var nameConflict = await _context.Positions.AnyAsync(x =>
                x.CompanyId == _currentUser.CompanyId &&
                x.Name == dto.Name.Trim() &&
                x.Id != id);

            if (nameConflict)
                return Fail<PositionDto>("Another position with this name already exists.");

            pos.Name = dto.Name.Trim();
            pos.Description = dto.Description;
            pos.IsActive = dto.IsActive;
            pos.UpdatedAt = DateTime.UtcNow;

            _context.Positions.Update(pos);
            await _context.SaveChangesAsync();

            var empCount = await _context.Employees
                .CountAsync(x =>
                    x.PositionId == id &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

            return Ok(new PositionDto
            {
                Id = pos.Id,
                Name = pos.Name,
                Description = pos.Description,
                IsActive = pos.IsActive,
                EmployeeCount = empCount,
                CreatedAt = pos.CreatedAt
            });
        }

        public async Task<ApiResponse<bool>> DeactivatePositionAsync(Guid id)
        {
            var pos = await _context.Positions
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == _currentUser.CompanyId);

            if (pos == null) return Fail<bool>("Position not found.");

            var empCount = await _context.Employees
                .CountAsync(x =>
                    x.PositionId == id &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

            if (empCount > 0)
                return Fail<bool>(
                    $"Cannot deactivate position — {empCount} active employee(s) hold it.");

            pos.IsActive = false;
            pos.UpdatedAt = DateTime.UtcNow;

            _context.Positions.Update(pos);
            await _context.SaveChangesAsync();

            return Ok(true);
        }

        private static ApiResponse<T> Ok<T>(T data) => new()
        { Success = true, Data = data, Message = string.Empty, Errors = null };

        private static ApiResponse<T> Fail<T>(string message) => new()
        { Success = false, Data = default, Message = message, Errors = null };
    }
}
