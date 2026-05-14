using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Auth
{
    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;

        public Guid UserId { get; set; }

        public Guid CompanyId { get; set; }

        public string Email { get; set; } = string.Empty;
    }
}
