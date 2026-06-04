using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Employees
{
    public class EmployeeDetailDto
    {
        // Identity
        public Guid Id { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public bool IsActive { get; set; }

        // Assignment — IDs + Names so the frontend doesn't need extra calls
        public Guid? BranchId { get; set; }
        public string? BranchName { get; set; }

        public Guid? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        public Guid? PositionId { get; set; }
        public string? PositionName { get; set; }

        /// <summary>Monthly basic salary in AED. Null if not set.</summary>
        public decimal? BasicSalary { get; set; }

        // Dates
        public DateOnly? JoiningDate { get; set; }
        public DateOnly? VisaExpiryDate { get; set; }
        public DateOnly? PassportExpiryDate { get; set; }
        public DateOnly? EmiratesIdExpiryDate { get; set; }

        // Document status helpers — computed, not stored
        public DocumentStatus VisaStatus { get; set; }
        public DocumentStatus PassportStatus { get; set; }
        public DocumentStatus EmiratesIdStatus { get; set; }

        // Audit
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public enum DocumentStatus
    {
        NotProvided,  // null date
        Valid,        // > 60 days remaining
        ExpiringSoon, // <= 60 days remaining
        Expired       // already past
    }
}
