using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Employees
{
    public class EmployeeDto
    {
        public Guid Id { get; set; }

        public string EmployeeCode { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public string? Email { get; set; }

        public bool IsActive { get; set; }
        // Assignment — IDs + Names so the frontend doesn't need extra calls
        public Guid? BranchId { get; set; }
        public string? BranchName { get; set; }

        public Guid? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        public Guid? PositionId { get; set; }
        public string? PositionName { get; set; }

        public DocumentStatus VisaStatus { get; set; }

    }
}
