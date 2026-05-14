using ServicePilot.Application.DTOs.Employees;
using ServicePilot.Domain.Entities;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Repositories
{
    public interface IEmployeeRepository
    {
        Task<IEnumerable<Employee>> GetAllAsync(
            Guid companyId,
            EmployeeFilterDto filter);

        Task<PagedResult<EmployeeDto>> GetPagedAsync(Guid companyId,
PagedEmployeeRequest filter);

        Task<Employee?> GetByIdAsync(Guid id, Guid companyId);

        Task AddAsync(Employee employee);

        void Update(Employee employee);

        Task SaveChangesAsync();



    }
}
