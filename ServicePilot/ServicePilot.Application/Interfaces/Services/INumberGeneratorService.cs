using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface INumberGeneratorService
    {
        Task<string> GenerateEmployeeCodeAsync(Guid companyId);
    }
}
