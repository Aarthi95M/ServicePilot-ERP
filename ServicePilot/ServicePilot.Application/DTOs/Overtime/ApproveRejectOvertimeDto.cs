using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Overtime
{
    public class ApproveRejectOvertimeDto
    {
        /// <summary>Approved or Rejected.</summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>Optional reason for rejection.</summary>
        public string? Reason { get; set; }
    }
}
