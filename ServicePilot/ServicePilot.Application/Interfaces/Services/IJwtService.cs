using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface IJwtService
    {
        string GenerateToken(Guid userId, Guid companyId, string email,string role, Guid? branchId);
    }
}
