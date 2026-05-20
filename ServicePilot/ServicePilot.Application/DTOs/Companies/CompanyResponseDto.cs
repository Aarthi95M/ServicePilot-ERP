using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Companies
{
    public class CompanyResponseDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string Timezone { get; set; } = "Asia/Dubai";
        public string? LogoUrl { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Counts — useful for the company profile screen
        public int TotalEmployees { get; set; }
        public int TotalBranches { get; set; }
        public int TotalUsers { get; set; }
    }
}
