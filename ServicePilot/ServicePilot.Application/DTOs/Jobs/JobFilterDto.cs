using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Jobs
{
    public class JobFilterDto
    {
        public Guid? AssignedEmployeeId { get; set; }
        public Guid? JobStatusId { get; set; }
        public Guid? JobTypeId { get; set; }
        public int? Priority { get; set; }
        public DateTime? ScheduledFrom { get; set; }
        public DateTime? ScheduledTo { get; set; }
        public string? Search { get; set; }  // job number, customer name
        public bool? IsCompleted { get; set; }  // completed_at IS NOT NULL
    }
}
