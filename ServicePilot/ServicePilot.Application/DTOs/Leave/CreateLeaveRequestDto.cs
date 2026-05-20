using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Leave
{
    public class CreateLeaveRequestDto
    {
        /// <summary>FK → leave_types. Must belong to same company.</summary>
        public Guid LeaveTypeId { get; set; }

        /// <summary>First day of leave (inclusive).</summary>
        public DateOnly StartDate { get; set; }

        /// <summary>Last day of leave (inclusive).</summary>
        public DateOnly EndDate { get; set; }

        /// <summary>Optional reason for leave.</summary>
        public string? Reason { get; set; }
    }
}
