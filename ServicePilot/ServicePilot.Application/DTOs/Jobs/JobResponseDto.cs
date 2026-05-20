using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Jobs
{
    /// <summary>
    /// Lightweight job response used in paged lists.
    /// Does NOT include status history or photos — use JobDetailDto for that.
    /// </summary>
    public class JobResponseDto
    {
        public Guid Id { get; set; }
        public string JobNumber { get; set; } = string.Empty;

        // Type
        public Guid? JobTypeId { get; set; }
        public string? JobTypeName { get; set; }

        // Status
        public Guid? JobStatusId { get; set; }
        public string? JobStatusName { get; set; }
        public string? StatusColor { get; set; }   // hex color code from job_statuses

        // Customer
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerPhone { get; set; }
        public string? Address { get; set; }

        // Location
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }

        // Priority
        /// <summary>Numeric value 1–4. For API consumers who work with ints.</summary>
        public int Priority { get; set; }

        /// <summary>Human label: Critical | High | Medium | Low.</summary>
        public string PriorityLabel { get; set; } = string.Empty;

        // Assignment
        public Guid? AssignedEmployeeId { get; set; }
        public string? AssignedEmployeeName { get; set; }
        public string? AssignedEmployeeCode { get; set; }

        // Schedule
        public DateTime? ScheduledAt { get; set; }
        public DateTime? ScheduledEndAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
