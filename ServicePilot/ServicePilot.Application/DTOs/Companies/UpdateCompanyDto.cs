using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Companies
{
    public class UpdateCompanyDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string Timezone { get; set; } = "Asia/Dubai";
        public string? LogoUrl { get; set; }
    }
}
