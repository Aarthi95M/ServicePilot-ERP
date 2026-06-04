using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Overtime
{
    public class OvertimeRequestResponseDto
    {
        public Guid Id { get; set; }

        // Employee
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;

        // Request details
        public DateOnly RequestDate { get; set; }
        public decimal HoursRequested { get; set; }
        public string? Reason { get; set; }

        // Status
        public string Status { get; set; } = string.Empty;

        // Approval
        public Guid? ApprovedBy { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }

        public DateTime CreatedAt { get; set; }

        /// <summary>Hourly overtime rate derived from employee BasicSalary / 30 / 8. Null if salary not set.</summary>
        public decimal? OvertimeRatePerHour { get; set; }

        /// <summary>Total amount = OvertimeRatePerHour × HoursRequested. Null if rate not available.</summary>
        public decimal? TotalAmount { get; set; }
    }
}
