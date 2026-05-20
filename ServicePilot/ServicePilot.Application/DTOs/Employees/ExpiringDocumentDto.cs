using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Employees
{
    public class ExpiringDocumentDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? BranchName { get; set; }
        public string? PhoneNumber { get; set; }

        // Each document type that is expiring/expired — null means not expiring
        public ExpiringDocument? Visa { get; set; }
        public ExpiringDocument? Passport { get; set; }
        public ExpiringDocument? EmiratesId { get; set; }
    }

    public class ExpiringDocument
    {
        public DateOnly ExpiryDate { get; set; }
        public int DaysLeft { get; set; }   // negative = already expired
        public DocumentStatus Status { get; set; }
    }
}
