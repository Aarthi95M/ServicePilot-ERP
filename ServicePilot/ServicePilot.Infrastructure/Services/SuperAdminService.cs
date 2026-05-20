using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.SuperAdmin;
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
    public class SuperAdminService : ISuperAdminService
    {
        private readonly AppDbContext _context;
        private readonly IPasswordService _passwordService;

        public SuperAdminService(
            AppDbContext context,
            IPasswordService passwordService)
        {
            _context = context;
            _passwordService = passwordService;
        }

        /// <summary>
        /// Creates a new company and its first Admin user in a single transaction.
        /// Called by the platform operator to onboard a new client.
        /// </summary>
        public async Task<ApiResponse<CompanyOnboardingResponseDto>> OnboardCompanyAsync(
            CreateCompanyDto dto)
        {
            // Check company name uniqueness across platform
            var nameExists = await _context.Companies
                .AnyAsync(x => x.Name == dto.CompanyName.Trim());

            if (nameExists)
                return Fail<CompanyOnboardingResponseDto>(
                    "A company with this name already exists.");

            // Check admin email uniqueness across platform
            var emailExists = await _context.Users
                .AnyAsync(x => x.Email == dto.AdminEmail.ToLower().Trim());

            if (emailExists)
                return Fail<CompanyOnboardingResponseDto>(
                    "A user with this email already exists.");

            // Resolve Admin role
            var adminRole = await _context.Roles
                .FirstOrDefaultAsync(x => x.Name == "Admin");

            if (adminRole == null)
                return Fail<CompanyOnboardingResponseDto>(
                    "Admin role not found in roles table. Run the seed script first.");

            // Create company
            var company = new Company
            {
                Id = Guid.NewGuid(),
                Name = dto.CompanyName.Trim(),
                Email = dto.CompanyEmail?.ToLower().Trim(),
                Phone = dto.CompanyPhone,
                Address = dto.Address,
                Timezone = dto.Timezone,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Companies.AddAsync(company);

            // Create first Admin user
            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                CompanyId = company.Id,
                FullName = dto.AdminFullName.Trim(),
                Email = dto.AdminEmail.ToLower().Trim(),
                PhoneNumber = dto.AdminPhone,
                RoleId = adminRole.Id,
                Role = adminRole,
                PasswordHash = _passwordService.HashPassword(dto.AdminPassword),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Users.AddAsync(adminUser);

            // Seed default app settings for the company
            await SeedDefaultSettingsAsync(company.Id);

            await _context.SaveChangesAsync();

            return Ok(new CompanyOnboardingResponseDto
            {
                CompanyId = company.Id,
                CompanyName = company.Name,
                AdminUserId = adminUser.Id,
                AdminEmail = adminUser.Email,
                CreatedAt = company.CreatedAt
            });
        }

        public async Task<ApiResponse<bool>> DeactivateCompanyAsync(Guid companyId)
        {
            var company = await _context.Companies
                .FirstOrDefaultAsync(x => x.Id == companyId);

            if (company == null)
                return Fail<bool>("Company not found.");

            company.IsActive = false;
            company.UpdatedAt = DateTime.UtcNow;

            _context.Companies.Update(company);
            await _context.SaveChangesAsync();

            return Ok(true);
        }

        /// <summary>
        /// Seeds sensible default app_settings for a new company.
        /// These can be changed later via PUT /api/company/config.
        /// </summary>
        private async Task SeedDefaultSettingsAsync(Guid companyId)
        {
            var defaults = new List<(string Group, string Key, string Value)>
            {
                ("Attendance", "ShiftStartTime",   "08:00"),
                ("Attendance", "GracePeriodEnd",   "08:15"),
                ("Attendance", "WorkingDays",      "Mon,Tue,Wed,Thu,Fri"),
                ("Overtime",   "MaxOvertimeHours", "4"),
            };

            foreach (var (group, key, value) in defaults)
            {
                await _context.AppSettings.AddAsync(new AppSetting
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    SettingGroup = group,
                    SettingKey = key,
                    SettingValue = value,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        private static ApiResponse<T> Ok<T>(T data) => new()
        { Success = true, Data = data, Message = string.Empty, Errors = null };

        private static ApiResponse<T> Fail<T>(string message) => new()
        { Success = false, Data = default, Message = message, Errors = null };
    }
}
