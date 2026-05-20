using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Overtime
{
    public class OvertimeFilterDto
    {
        public Guid? EmployeeId { get; set; }
        public string? Status { get; set; }
        public DateOnly? DateFrom { get; set; }
        public DateOnly? DateTo { get; set; }
    }
}
