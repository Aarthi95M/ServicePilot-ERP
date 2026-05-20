using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.OrgStructure
{
    public class DepartmentDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int EmployeeCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateDepartmentDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class UpdateDepartmentDto
    {
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}
