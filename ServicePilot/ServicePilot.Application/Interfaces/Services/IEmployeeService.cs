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

        Task<ApiResponse<EmployeeDetailDto>> GetByIdAsync(Guid id);

        Task<ApiResponse<IEnumerable<ExpiringDocumentDto>>> GetExpiringDocumentsAsync(int days);

        /// <summary>
        /// Returns the employee record linked to the currently authenticated user.
        /// Used by the mobile app profile screen.
        /// </summary>
        Task<ApiResponse<EmployeeDetailDto>> GetMyProfileAsync();

        /// <summary>
        /// Admin / HRManager shortcut that atomically creates both an Employee
        /// record and a linked Technician user account in a single transaction.
        /// Prevents the two-step "create employee then create user" workflow.
        /// </summary>
        Task<ApiResponse<TechnicianCreatedDto>> CreateTechnicianAsync(CreateTechnicianDto dto);
    }
}
