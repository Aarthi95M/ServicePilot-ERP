using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Attendance
{
    public class AttendanceFilterDto
    {
        public Guid? EmployeeId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? DepartmentId { get; set; }
        public DateOnly? DateFrom { get; set; }
        public DateOnly? DateTo { get; set; }

        /// <summary>Present | Late | Absent</summary>
        public string? Status { get; set; }
    }
}
