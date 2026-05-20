using ServicePilot.Application.DTOs.Overtime;
using ServicePilot.Domain.Entities;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Repositories
{
    public interface IOvertimeRepository
    {
        Task<OvertimeRequest?> GetByIdAsync(Guid id, Guid companyId);
        Task<PagedResult<OvertimeRequest>> GetPagedAsync(
            Guid companyId, PagedOvertimeRequest filter);
        Task<IEnumerable<OvertimeRequest>> GetByEmployeeAsync(
            Guid employeeId, Guid companyId);

        /// <summary>
        /// Prevents duplicate overtime requests for the same employee on the same date.
        /// </summary>
        Task<bool> HasExistingRequestAsync(
            Guid employeeId, Guid companyId,
            DateOnly requestDate, Guid? excludeId = null);

        Task AddAsync(OvertimeRequest request);
        void Update(OvertimeRequest request);
        Task SaveChangesAsync();
    }
}
