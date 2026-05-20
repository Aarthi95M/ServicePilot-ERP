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
    }
}
