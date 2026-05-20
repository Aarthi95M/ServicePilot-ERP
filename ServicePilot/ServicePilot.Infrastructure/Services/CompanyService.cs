using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Companies;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Infrastructure.Persistence.Models;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Infrastructure.Services
{
    public class CompanyService : ICompanyService
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        // app_settings key constants
        private const string GRP_ATTENDANCE = "Attendance";
        private const string KEY_SHIFT_START = "ShiftStartTime";
        private const string KEY_GRACE_END = "GracePeriodEnd";
        private const string KEY_WORKING_DAYS = "WorkingDays";
        private const string GRP_OVERTIME = "Overtime";
        private const string KEY_MAX_OT = "MaxOvertimeHours";

        public CompanyService(
            AppDbContext context,
            ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ApiResponse<CompanyResponseDto>> GetMyCompanyAsync()
        {
            var company = await _context.Companies
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == _currentUser.CompanyId);

            if (company == null)
                return Fail<CompanyResponseDto>("Company not found.");

            var employeeCount = await _context.Employees
                .CountAsync(x => x.CompanyId == _currentUser.CompanyId && x.IsActive);

            var branchCount = await _context.Branches
                .CountAsync(x => x.CompanyId == _currentUser.CompanyId && x.IsActive);

            var userCount = await _context.Users
                .CountAsync(x => x.CompanyId == _currentUser.CompanyId && x.IsActive);

            return Ok(new CompanyResponseDto
            {
                Id = company.Id,
                Name = company.Name,
                Email = company.Email,
                Phone = company.Phone,
                Address = company.Address,
                Timezone = company.Timezone ?? "Asia/Dubai",
                LogoUrl = company.LogoUrl,
                IsActive = company.IsActive,
                CreatedAt = company.CreatedAt,
                UpdatedAt = company.UpdatedAt,
                TotalEmployees = employeeCount,
                TotalBranches = branchCount,
                TotalUsers = userCount
            });
        }

        public async Task<ApiResponse<CompanyResponseDto>> UpdateMyCompanyAsync(
            UpdateCompanyDto dto)
        {
            var company = await _context.Companies
                .FirstOrDefaultAsync(x => x.Id == _currentUser.CompanyId);

            if (company == null)
                return Fail<CompanyResponseDto>("Company not found.");

            company.Name = dto.Name;
            company.Email = dto.Email;
            company.Phone = dto.Phone;
            company.Address = dto.Address;
            company.Timezone = dto.Timezone;
            company.LogoUrl = dto.LogoUrl;
            company.UpdatedAt = DateTime.UtcNow;

            _context.Companies.Update(company);
            await _context.SaveChangesAsync();

            return await GetMyCompanyAsync();
        }

        public async Task<ApiResponse<CompanyConfigDto>> GetConfigAsync()
        {
            var settings = await _context.AppSettings
                .AsNoTracking()
                .Where(x => x.CompanyId == _currentUser.CompanyId)
                .ToListAsync();

            string GetVal(string group, string key, string defaultVal)
                => settings.FirstOrDefault(s =>
                    s.SettingGroup == group && s.SettingKey == key)?.SettingValue
                   ?? defaultVal;

            var company = await _context.Companies
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == _currentUser.CompanyId);

            return Ok(new CompanyConfigDto
            {
                ShiftStartTime = GetVal(GRP_ATTENDANCE, KEY_SHIFT_START, "08:00"),
                GracePeriodEnd = GetVal(GRP_ATTENDANCE, KEY_GRACE_END, "08:15"),
                WorkingDays = GetVal(GRP_ATTENDANCE, KEY_WORKING_DAYS, "Mon,Tue,Wed,Thu,Fri"),
                MaxOvertimeHours = int.TryParse(
                    GetVal(GRP_OVERTIME, KEY_MAX_OT, "4"), out var ot) ? ot : 4,
                Timezone = company?.Timezone ?? "Asia/Dubai"
            });
        }

        public async Task<ApiResponse<CompanyConfigDto>> UpdateConfigAsync(CompanyConfigDto dto)
        {
            var companyId = _currentUser.CompanyId;

            await UpsertSettingAsync(companyId, GRP_ATTENDANCE, KEY_SHIFT_START, dto.ShiftStartTime);
            await UpsertSettingAsync(companyId, GRP_ATTENDANCE, KEY_GRACE_END, dto.GracePeriodEnd);
            await UpsertSettingAsync(companyId, GRP_ATTENDANCE, KEY_WORKING_DAYS, dto.WorkingDays);
            await UpsertSettingAsync(companyId, GRP_OVERTIME, KEY_MAX_OT, dto.MaxOvertimeHours.ToString());

            await _context.SaveChangesAsync();
            return await GetConfigAsync();
        }

        // ── Helpers ───────────────────────────────────────────────────

        private async Task UpsertSettingAsync(
            Guid companyId, string group, string key, string? value)
        {
            var existing = await _context.AppSettings
                .FirstOrDefaultAsync(x =>
                    x.CompanyId == companyId &&
                    x.SettingGroup == group &&
                    x.SettingKey == key);

            if (existing == null)
            {
                await _context.AppSettings.AddAsync(new Domain.Entities.AppSetting
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    SettingGroup = group,
                    SettingKey = key,
                    SettingValue = value,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.SettingValue = value;
                existing.UpdatedAt = DateTime.UtcNow;
                _context.AppSettings.Update(existing);
            }
        }

        private static ApiResponse<T> Ok<T>(T data) => new()
        { Success = true, Data = data, Message = string.Empty, Errors = null };

        private static ApiResponse<T> Fail<T>(string message) => new()
        { Success = false, Data = default, Message = message, Errors = null };
    }
}
