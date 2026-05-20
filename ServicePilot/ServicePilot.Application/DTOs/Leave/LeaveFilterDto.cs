using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Leave
{
    public class LeaveFilterDto
    {
        public Guid? EmployeeId { get; set; }
        public Guid? LeaveTypeId { get; set; }
        public string? Status { get; set; }   // Pending|Approved|Rejected|Cancelled
        public DateOnly? DateFrom { get; set; }
        public DateOnly? DateTo { get; set; }
    }
}
