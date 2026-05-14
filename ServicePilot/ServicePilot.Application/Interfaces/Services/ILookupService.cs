using ServicePilot.Application.DTOs.Lookup;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface ILookupService
    {
        Task<ApiResponse<List<EmployeeDropdownDto>>> GetEmployeesAsync();

        Task<ApiResponse<List<BranchDropdownDto>>> GetBranchesAsync();

        Task<ApiResponse<List<DepartmentDropdownDto>>> GetDepartmentsAsync();

        Task<ApiResponse<List<PositionDropdownDto>>> GetPositionsAsync();
    }
}
