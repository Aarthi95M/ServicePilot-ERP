using ServicePilot.Application.DTOs.OrgStructure;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface IOrgStructureService
    {
        // Branches
        Task<ApiResponse<IEnumerable<BranchDto>>> GetBranchesAsync();
        Task<ApiResponse<BranchDto>> GetBranchByIdAsync(Guid id);
        Task<ApiResponse<BranchDto>> CreateBranchAsync(CreateBranchDto dto);
        Task<ApiResponse<BranchDto>> UpdateBranchAsync(Guid id, UpdateBranchDto dto);
        Task<ApiResponse<bool>> DeactivateBranchAsync(Guid id);

        // Departments
        Task<ApiResponse<IEnumerable<DepartmentDto>>> GetDepartmentsAsync();
        Task<ApiResponse<DepartmentDto>> CreateDepartmentAsync(CreateDepartmentDto dto);
        Task<ApiResponse<DepartmentDto>> UpdateDepartmentAsync(Guid id, UpdateDepartmentDto dto);
        Task<ApiResponse<bool>> DeactivateDepartmentAsync(Guid id);

        // Positions
        Task<ApiResponse<IEnumerable<PositionDto>>> GetPositionsAsync();
        Task<ApiResponse<PositionDto>> CreatePositionAsync(CreatePositionDto dto);
        Task<ApiResponse<PositionDto>> UpdatePositionAsync(Guid id, UpdatePositionDto dto);
        Task<ApiResponse<bool>> DeactivatePositionAsync(Guid id);
    }
}
