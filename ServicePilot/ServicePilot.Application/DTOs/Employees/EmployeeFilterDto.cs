using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Employees
{
    public class EmployeeFilterDto
    {
        public Guid? BranchId { get; set; }
        public Guid? DepartmentId { get; set; }
        public Guid? PositionId { get; set; }

        public bool? IsActive { get; set; }

        public string? Search { get; set; }
    }
}
