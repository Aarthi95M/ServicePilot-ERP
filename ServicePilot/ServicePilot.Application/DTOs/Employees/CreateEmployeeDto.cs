using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Employees
{
    public class CreateEmployeeDto
    {
        public string FullName { get; set; } = string.Empty;

        public string? Phone { get; set; }
        public string? Email { get; set; }

        public Guid? BranchId { get; set; }
        public Guid? PositionId { get; set; }
        public Guid? DepartmentId { get; set; }

        public DateOnly? VisaExpiryDate { get; set; }
        public DateOnly? PassportExpiryDate { get; set; }
        public DateOnly? EmiratesIdExpiryDate { get; set; }
        public DateOnly? JoiningDate { get; set; }
    }
}
