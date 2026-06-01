using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Users;
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
    public class UserManagementService : IUserManagementService
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IPasswordService _passwordService;

        public UserManagementService(
            AppDbContext context,
            ICurrentUserService currentUser,
            IPasswordService passwordService)
        {
            _context = context;
            _currentUser = currentUser;
            _passwordService = passwordService;
        }

        public async Task<ApiResponse<IEnumerable<UserResponseDto>>> GetAllAsync()
        {
            var users = await _context.Users
                .AsNoTracking()
                .Include(x => x.Branch)
                .Include(x => x.Employee)
                .Include(x => x.Role)          // ← required for MapToDto: u.Role.Name
                .Where(x => x.CompanyId == _currentUser.CompanyId)
                .OrderBy(x => x.FullName)
                .ToListAsync();

            return Ok(users.Select(MapToDto));
        }

        public async Task<ApiResponse<UserResponseDto>> GetByIdAsync(Guid id)
        {
            var user = await _context.Users
                .AsNoTracking()
                .Include(x => x.Branch)
                .Include(x => x.Employee)
                .Include(x => x.Role)          // ← required for MapToDto: u.Role.Name
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == _currentUser.CompanyId);

            if (user == null)
                return Fail<UserResponseDto>("User not found.");

            return Ok(MapToDto(user));
        }

        public async Task<ApiResponse<UserResponseDto>> CreateAsync(CreateUserDto dto)
        {
            // Email must be unique within the company
            var emailExists = await _context.Users.AnyAsync(x =>
                x.CompanyId == _currentUser.CompanyId &&
                x.Email == dto.Email.ToLower().Trim());

            if (emailExists)
                return Fail<UserResponseDto>(
                    "A user with this email already exists in this company.");

            // Validate role exists
            var role = await _context.Roles
                .FirstOrDefaultAsync(x => x.Name == dto.Role);

            if (role == null)
                return Fail<UserResponseDto>($"Role '{dto.Role}' not found.");

            // Validate branch if provided
            if (dto.BranchId.HasValue)
            {
                var branchExists = await _context.Branches.AnyAsync(x =>
                    x.Id == dto.BranchId &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

                if (!branchExists)
                    return Fail<UserResponseDto>("Branch not found or inactive.");
            }

            // Validate employee if provided
            if (dto.EmployeeId.HasValue)
            {
                var employeeExists = await _context.Employees.AnyAsync(x =>
                    x.Id == dto.EmployeeId &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

                if (!employeeExists)
                    return Fail<UserResponseDto>("Employee not found or inactive.");

                // Check employee not already linked to another user
                var alreadyLinked = await _context.Users.AnyAsync(x =>
                    x.EmployeeId == dto.EmployeeId &&
                    x.CompanyId == _currentUser.CompanyId);

                if (alreadyLinked)
                    return Fail<UserResponseDto>(
                        "This employee is already linked to another user account.");
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.CompanyId,
                FullName = dto.FullName.Trim(),
                Email = dto.Email.ToLower().Trim(),
                PhoneNumber = dto.PhoneNumber,
                RoleId = role.Id,
                Role = role,
                BranchId = dto.BranchId,
                EmployeeId = dto.EmployeeId,
                PasswordHash = _passwordService.HashPassword(dto.Password),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(user.Id);
        }

        public async Task<ApiResponse<UserResponseDto>> UpdateAsync(
            Guid id, UpdateUserDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == _currentUser.CompanyId);

            if (user == null)
                return Fail<UserResponseDto>("User not found.");

            // Validate role
            var role = await _context.Roles
                .FirstOrDefaultAsync(x => x.Name == dto.Role);

            if (role == null)
                return Fail<UserResponseDto>($"Role '{dto.Role}' not found.");

            // Validate branch
            if (dto.BranchId.HasValue)
            {
                var branchExists = await _context.Branches.AnyAsync(x =>
                    x.Id == dto.BranchId &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

                if (!branchExists)
                    return Fail<UserResponseDto>("Branch not found or inactive.");
            }

            // Validate employee
            if (dto.EmployeeId.HasValue && dto.EmployeeId != user.EmployeeId)
            {
                var alreadyLinked = await _context.Users.AnyAsync(x =>
                    x.EmployeeId == dto.EmployeeId &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.Id != id);

                if (alreadyLinked)
                    return Fail<UserResponseDto>(
                        "This employee is already linked to another user account.");
            }

            user.FullName = dto.FullName.Trim();
            user.PhoneNumber = dto.PhoneNumber;
            user.RoleId = role.Id;
            user.Role = role;
            user.BranchId = dto.BranchId;
            user.EmployeeId = dto.EmployeeId;
            user.IsActive = dto.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(id);
        }

        public async Task<ApiResponse<bool>> ResetPasswordAsync(
            Guid id, ResetPasswordDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == _currentUser.CompanyId);

            if (user == null)
                return Fail<bool>("User not found.");

            user.PasswordHash = _passwordService.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return Ok(true);
        }

        public async Task<ApiResponse<bool>> DeactivateAsync(Guid id)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    x.CompanyId == _currentUser.CompanyId);

            if (user == null)
                return Fail<bool>("User not found.");

            // Cannot deactivate yourself
            if (user.Id == _currentUser.UserId)
                return Fail<bool>("You cannot deactivate your own account.");

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            return Ok(true);
        }

        // ── Mapping ───────────────────────────────────────────────────

        private static UserResponseDto MapToDto(User u) => new()
        {
            Id = u.Id,
            FullName = u.FullName,
            Email = u.Email,
            PhoneNumber = u.PhoneNumber,
            Role = u.Role?.Name ?? string.Empty,
            BranchId = u.BranchId,
            BranchName = u.Branch?.Name,
            EmployeeId = u.EmployeeId,
            EmployeeName = u.Employee?.FullName,
            IsActive = u.IsActive,
            LastLoginAt = u.LastLoginAt,
            CreatedAt = u.CreatedAt,
            UpdatedAt = u.UpdatedAt
        };

        private static ApiResponse<T> Ok<T>(T data) => new()
        { Success = true, Data = data, Message = string.Empty, Errors = null };

        private static ApiResponse<T> Fail<T>(string message) => new()
        { Success = false, Data = default, Message = message, Errors = null };
    }
}
