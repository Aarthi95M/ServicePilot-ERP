using ServicePilot.Application.DTOs.Employees;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface IEmployeeService
    {
        Task<ApiResponse<IEnumerable<EmployeeDto>>> GetAllAsync(
            EmployeeFilterDto filter);

        Task<ApiResponse<PagedResult<EmployeeDto>>> GetPagedAsync(
    PagedEmployeeRequest filter);

        Task<ApiResponse<EmployeeDto>> CreateAsync(
            CreateEmployeeDto dto);

        Task<ApiResponse<EmployeeDto>> UpdateAsync(Guid id, UpdateEmployeeDto dto);

        Task<ApiResponse<bool>> DeleteAsync(Guid id);

    }
}
