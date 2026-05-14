using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface ICurrentUserService
    {
        Guid UserId { get; }

        Guid CompanyId { get; }

        string Email { get; }
        Guid? BranchId { get; }

        string Role { get; }

    }
}
