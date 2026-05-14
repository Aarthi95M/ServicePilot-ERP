using ServicePilot.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Repositories
{
    public interface IAuditRepository
    {
        Task AddAsync(AuditLog auditLog);

        Task SaveChangesAsync();
    }
}
