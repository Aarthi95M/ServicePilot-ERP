using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Auth;
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
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IPasswordService _passwordService;
        private readonly ICurrentUserService _currentUser;

        public AuthService(
            AppDbContext context,
            IJwtService jwtService,
            IPasswordService passwordService,
            ICurrentUserService currentUser)
        {
            _context = context;
            _jwtService = jwtService;
            _passwordService = passwordService;
            _currentUser = currentUser;
        }

        public async Task<ApiResponse<LoginResponseDto>> LoginAsync(
            LoginRequestDto request)
        {
            var user = await _context.Users
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.Email == request.Email &&
                    x.IsActive);

            if (user == null)
            {
                return new ApiResponse<LoginResponseDto>
                {
                    Success = false,
                    Message = "Invalid email or password"
                };
            }

            var validPassword = _passwordService.VerifyPassword(
                request.Password,
                user.PasswordHash);

            if (!validPassword)
            {
                return new ApiResponse<LoginResponseDto>
                {
                    Success = false,
                    Message = "Invalid email or password"
                };
            }
            // Update last login timestamp
            user.LastLoginAt = DateTime.UtcNow;
            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            var token = _jwtService.GenerateToken(
                user.Id,
                user.CompanyId,
                user.Email,
                user.Role.Name,
                user.BranchId);

            return new ApiResponse<LoginResponseDto>
            {
                Success = true,
                Message = "Login successful",

                Data = new LoginResponseDto
                {
                    Token = token,
                    UserId = user.Id,
                    CompanyId = user.CompanyId,
                    Email = user.Email,
                    Role = user.Role.Name
                }
            };
        }

        //public bool IsAdmin()
        //=> _currentUser.Role == "Admin";

        //public bool IsSupervisor()
        //    => _currentUser.Role == "Supervisor";

        //public bool IsDispatcher()
        //    => _currentUser.Role == "Dispatcher";

        // ════════════════════════════════════════════════════════════════
        // ROLE CHECKS
        // Single source of truth — controllers call these, never compare
        // _currentUser.Role == "string" directly anywhere in the codebase.
        // ════════════════════════════════════════════════════════════════

        public bool IsAdmin()
            => _currentUser.Role == Roles.Admin;

        public bool IsSupervisor()
            => _currentUser.Role == Roles.Supervisor;

        public bool IsHRManager()
            => _currentUser.Role == Roles.HRManager;

        public bool IsDispatcher()
            => _currentUser.Role == Roles.Dispatcher;

        public bool IsTechnician()
            => _currentUser.Role == Roles.Technician;

        // ════════════════════════════════════════════════════════════════
        // PERMISSION CHECKS
        // ════════════════════════════════════════════════════════════════

        /// <summary>
        /// Determines whether the current user can manage (read/update) a given employee.
        ///
        /// Admin      → any employee in same company
        /// HRManager  → any employee in same company (HR data access)
        /// Supervisor → only employees in their branch
        /// Dispatcher → no employee management access (read via controller attributes only)
        /// Employee   → only themselves (handled at controller level, not here)
        /// </summary>
        public bool CanManageEmployee(Employee employee)
        {
            if (employee == null) return false;

            // Admin and HR Manager — full company scope
            if (IsAdmin() || IsHRManager())
                return employee.CompanyId == _currentUser.CompanyId;

            // Supervisor — branch scope only
            if (IsSupervisor())
                return employee.CompanyId == _currentUser.CompanyId
                    && employee.BranchId == _currentUser.BranchId;

            // Dispatcher and Employee — no management access
            return false;
        }
        /// <summary>
        /// Only Admin and HR Manager can edit HR documents
        /// (visa expiry, passport expiry, Emirates ID expiry).
        /// Supervisors are locked out of these fields.
        /// </summary>
        public bool CanEditHRDocuments()
            => IsAdmin() || IsHRManager();

    }
}
