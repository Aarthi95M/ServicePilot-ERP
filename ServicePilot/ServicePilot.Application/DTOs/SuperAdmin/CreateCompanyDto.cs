using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.SuperAdmin
{
    /// <summary>
    /// Used by Super Admin to onboard a new client company.
    /// Also creates the first Admin user for that company.
    /// </summary>
    public class CreateCompanyDto
    {
        // Company details
        public string CompanyName { get; set; } = string.Empty;
        public string? CompanyEmail { get; set; }
        public string? CompanyPhone { get; set; }
        public string? Address { get; set; }
        public string Timezone { get; set; } = "Asia/Dubai";

        // First Admin user
        public string AdminFullName { get; set; } = string.Empty;
        public string AdminEmail { get; set; } = string.Empty;
        public string AdminPassword { get; set; } = string.Empty;
        public string? AdminPhone { get; set; }
    }

    public class CompanyOnboardingResponseDto
    {
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public Guid AdminUserId { get; set; }
        public string AdminEmail { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>Summary row returned in GET /api/superadmin/companies.</summary>
    public class CompanySummaryDto
    {
        public Guid   CompanyId    { get; set; }
        public string CompanyName  { get; set; } = string.Empty;
        public string? Email       { get; set; }
        public string? Phone       { get; set; }
        public string Timezone     { get; set; } = "Asia/Dubai";
        public bool   IsActive     { get; set; }
        public int    UserCount    { get; set; }
        public int    EmployeeCount { get; set; }
        public DateTime CreatedAt  { get; set; }
    }
}
