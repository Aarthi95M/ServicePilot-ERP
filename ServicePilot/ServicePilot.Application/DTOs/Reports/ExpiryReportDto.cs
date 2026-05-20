using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Reports
{
    /// <summary>
    /// Document expiry report — visa, passport, Emirates ID.
    /// Primary tool for HR Manager to manage UAE compliance.
    /// </summary>
    public class ExpiryReportDto
    {
        public int DaysThreshold { get; set; }
        public int TotalAffected { get; set; }
        public List<ExpiryReportRowDto> Rows { get; set; } = new();
    }

    public class ExpiryReportRowDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string? BranchName { get; set; }
        public string? PhoneNumber { get; set; }

        public DateOnly? VisaExpiryDate { get; set; }
        public int? VisaDaysLeft { get; set; }
        public DateOnly? PassportExpiryDate { get; set; }
        public int? PassportDaysLeft { get; set; }
        public DateOnly? EmiratesIdExpiryDate { get; set; }
        public int? EmiratesIdDaysLeft { get; set; }

        /// <summary>True if any document is already expired.</summary>
        public bool HasExpired { get; set; }
    }
}
