using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Users
{
    public class UpdateUserDto
    {
        public string FullName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Role { get; set; } = string.Empty;
        public Guid? BranchId { get; set; }
        public Guid? EmployeeId { get; set; }
        public bool IsActive { get; set; }
    }
}
