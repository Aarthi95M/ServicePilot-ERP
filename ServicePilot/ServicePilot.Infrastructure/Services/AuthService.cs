using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Auth;
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
                .FirstOrDefaultAsync(x => x.Email == request.Email);

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
                    Email = user.Email
                }
            };
        }

        public bool IsAdmin()
        => _currentUser.Role == "Admin";

        public bool IsSupervisor()
            => _currentUser.Role == "Supervisor";

        public bool IsDispatcher()
            => _currentUser.Role == "Dispatcher";

        public bool CanManageEmployee(Employee employee)
        {
            // Admin → all company employees
            if (IsAdmin())
            {
                return employee.CompanyId
                    == _currentUser.CompanyId;
            }

            // Supervisor → only same branch
            if (IsSupervisor())
            {
                return employee.CompanyId
                    == _currentUser.CompanyId
                    &&
                    employee.BranchId
                    == _currentUser.BranchId;
            }

            // Dispatcher → no edit access
            return false;
        }
    }
}
