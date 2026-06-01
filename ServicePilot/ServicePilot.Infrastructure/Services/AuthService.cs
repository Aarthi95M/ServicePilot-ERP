using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ServicePilot.Application.DTOs.Auth;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;
using ServicePilot.Domain.Entities;
using ServicePilot.Infrastructure.Persistence.Models;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
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
        private readonly IConfiguration _config;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            AppDbContext context,
            IJwtService jwtService,
            IPasswordService passwordService,
            ICurrentUserService currentUser,
            IConfiguration config,
            ILogger<AuthService> logger)
        {
            _context = context;
            _jwtService = jwtService;
            _passwordService = passwordService;
            _currentUser = currentUser;
            _config = config;
            _logger = logger;
        }

        public async Task<ApiResponse<LoginResponseDto>> LoginAsync(
            LoginRequestDto request)
        {
            var user = await _context.Users
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.Email == request.Email.ToLower().Trim() &&
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

        // ════════════════════════════════════════════════════════════════
        // FORGOT / RESET PASSWORD
        // ════════════════════════════════════════════════════════════════

        public async Task ForgotPasswordAsync(ForgotPasswordRequestDto request)
        {
            // Always exit without error — never reveal whether the email exists.
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == request.Email.ToLower().Trim()
                                       && u.IsActive);

            if (user == null) return; // silent exit

            // Invalidate any previous unused tokens for this user
            await _context.PasswordResetTokens
                .Where(t => t.UserId == user.Id && !t.IsUsed)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsUsed, true));

            // Generate a cryptographically secure 32-byte token
            var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
                               .Replace("+", "-").Replace("/", "_").TrimEnd('=');

            var tokenHash = HashToken(rawToken);

            await _context.PasswordResetTokens.AddAsync(new PasswordResetToken
            {
                Id        = Guid.NewGuid(),
                UserId    = user.Id,
                TokenHash = tokenHash,
                ExpiresAt = DateTime.UtcNow.AddHours(1),
                IsUsed    = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            // TODO: wire up an email service and send the link below.
            // For now we log the link so dev/ops can manually provide it.
            var resetUrl = $"{_config["App:BaseUrl"] ?? "https://app.servicepilot.ae"}" +
                           $"/reset-password?token={rawToken}";

            _logger.LogInformation(
                "Password reset requested for {Email}. Reset URL (expires 1 h): {Url}",
                user.Email, resetUrl);
        }

        public async Task<ApiResponse<bool>> ResetPasswordAsync(ResetPasswordRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Token))
                return Fail<bool>("Invalid or missing reset token.");

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
                return Fail<bool>("Password must be at least 8 characters.");

            var tokenHash = HashToken(request.Token);

            var resetToken = await _context.PasswordResetTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && !t.IsUsed);

            if (resetToken == null)
                return Fail<bool>("Invalid or expired reset token.");

            if (resetToken.ExpiresAt < DateTime.UtcNow)
            {
                resetToken.IsUsed = true;
                await _context.SaveChangesAsync();
                return Fail<bool>("This reset link has expired. Please request a new one.");
            }

            // Set new password
            resetToken.User.PasswordHash = _passwordService.HashPassword(request.NewPassword);
            resetToken.IsUsed = true;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Password successfully reset for user {UserId}", resetToken.UserId);
            return Ok(true);
        }

        public async Task<ApiResponse<bool>> ChangePasswordAsync(ChangePasswordRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
                return Fail<bool>("New password must be at least 8 characters.");

            var user = await _context.Users.FindAsync(_currentUser.UserId);
            if (user == null)
                return Fail<bool>("User not found.");

            if (!_passwordService.VerifyPassword(request.CurrentPassword, user.PasswordHash))
                return Fail<bool>("Current password is incorrect.");

            user.PasswordHash = _passwordService.HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password changed for user {UserId}", user.Id);
            return Ok(true);
        }

        // SHA-256 hash of the raw token — we never store the raw value
        private static string HashToken(string rawToken)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }

        private static ApiResponse<T> Ok<T>(T data) => new()
        { Success = true, Data = data };

        private static ApiResponse<T> Fail<T>(string message) => new()
        { Success = false, Message = message };

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
