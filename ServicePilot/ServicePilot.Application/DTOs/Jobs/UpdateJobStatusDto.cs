using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Jobs
{
    public class UpdateJobStatusDto
    {
        /// <summary>FK → job_statuses.id. Must belong to same company.</summary>
        public Guid JobStatusId { get; set; }

        /// <summary>
        /// Optional comment entered by the user explaining the status change
        /// (e.g. "Arrived on site, customer requested 30 min delay"). Stored on
        /// the JobStatusHistory row and surfaced in the status timeline on both
        /// the web dashboard and the mobile app.
        /// </summary>
        public string? Notes { get; set; }
    }
}
