using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Jobs
{
    public class UpdateJobDto
    {
        public Guid JobTypeId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerPhone { get; set; }
        public string? Address { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public int Priority { get; set; } = 3;
        public DateTime? ScheduledAt { get; set; }
        public DateTime? ScheduledEndAt { get; set; }
        public string? Notes { get; set; }
    }
}
