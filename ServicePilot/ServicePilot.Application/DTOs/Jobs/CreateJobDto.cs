using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Jobs
{
    public class CreateJobDto
    {
        /// <summary>Type of job (FK → job_types). Required.</summary>
        public Guid JobTypeId { get; set; }

        /// <summary>Customer full name.</summary>
        public string CustomerName { get; set; } = string.Empty;

        /// <summary>Customer contact number.</summary>
        public string? CustomerPhone { get; set; }

        /// <summary>Job site address (free text).</summary>
        public string? Address { get; set; }

        /// <summary>GPS latitude of job site. Optional.</summary>
        public decimal? Latitude { get; set; }

        /// <summary>GPS longitude of job site. Optional.</summary>
        public decimal? Longitude { get; set; }

        /// <summary>Priority: 1=Critical, 2=High, 3=Medium, 4=Low.</summary>
        public int Priority { get; set; } = 3;

        /// <summary>When the job is scheduled to start (UTC).</summary>
        public DateTime? ScheduledAt { get; set; }

        /// <summary>When the job is expected to end (UTC).</summary>
        public DateTime? ScheduledEndAt { get; set; }

        /// <summary>Optional employee to assign at creation time.</summary>
        public Guid? AssignedEmployeeId { get; set; }

        /// <summary>Additional notes for the assigned employee.</summary>
        public string? Notes { get; set; }
    }
}
