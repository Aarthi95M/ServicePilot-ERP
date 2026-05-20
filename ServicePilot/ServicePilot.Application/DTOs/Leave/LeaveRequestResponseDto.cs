using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Leave
{
    public class LeaveRequestResponseDto
    {
        public Guid Id { get; set; }

        // Employee
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;

        // Leave type
        public Guid LeaveTypeId { get; set; }
        public string LeaveTypeName { get; set; } = string.Empty;
        public bool IsPaid { get; set; }

        // Dates
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }

        /// <summary>Calculated: EndDate - StartDate + 1 (inclusive).</summary>
        public int TotalDays { get; set; }

        public string? Reason { get; set; }

        // Status
        public string Status { get; set; } = string.Empty;

        // Approval
        public Guid? ApprovedBy { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
