using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Users
{
    public class CreateUserDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }

        /// <summary>
        /// Role name: Admin | HRManager | Supervisor | Dispatcher | Technician.
        /// Must match exactly the name in the roles table.
        /// </summary>
        public string Role { get; set; } = string.Empty;

        /// <summary>Required for Supervisor and Technician roles.</summary>
        public Guid? BranchId { get; set; }

        /// <summary>
        /// Optional: link to an existing employee profile.
        /// Required for Technician and Supervisor roles (they need GPS check-in).
        /// </summary>
        public Guid? EmployeeId { get; set; }

        /// <summary>
        /// Initial password. Must be at least 8 characters.
        /// User should change on first login (future enhancement).
        /// </summary>
        public string Password { get; set; } = string.Empty;
    }
}
