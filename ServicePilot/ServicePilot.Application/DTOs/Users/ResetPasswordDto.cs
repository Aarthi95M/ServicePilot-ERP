using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Users
{
    public class ResetPasswordDto
    {
        public string NewPassword { get; set; } = string.Empty;
    }
}
