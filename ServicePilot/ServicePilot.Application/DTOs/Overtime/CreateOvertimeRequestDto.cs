using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Overtime
{
    public class CreateOvertimeRequestDto
    {
        /// <summary>Date the overtime work was performed.</summary>
        public DateOnly RequestDate { get; set; }

        /// <summary>Number of overtime hours requested. Max 24.</summary>
        public decimal HoursRequested { get; set; }

        /// <summary>Reason for overtime work.</summary>
        public string? Reason { get; set; }
    }
}
