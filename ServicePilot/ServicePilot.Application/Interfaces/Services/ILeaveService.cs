using ServicePilot.Application.DTOs.Leave;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface ILeaveService
    {
        Task<ApiResponse<LeaveRequestResponseDto>> CreateAsync(CreateLeaveRequestDto dto);
        Task<ApiResponse<LeaveRequestResponseDto>> GetByIdAsync(Guid id);
        Task<ApiResponse<PagedResult<LeaveRequestResponseDto>>> GetPagedAsync(PagedLeaveRequest filter);
        Task<ApiResponse<IEnumerable<LeaveRequestResponseDto>>> GetMyRequestsAsync();
        Task<ApiResponse<LeaveRequestResponseDto>> ApproveRejectAsync(Guid id, ApproveRejectLeaveDto dto);
        Task<ApiResponse<LeaveRequestResponseDto>> CancelAsync(Guid id);
        Task<ApiResponse<IEnumerable<LeaveSummaryDto>>> GetSummaryAsync(int year, Guid? employeeId, Guid? departmentId);
        Task<ApiResponse<List<LeaveTypeBalance>>> GetMyBalanceAsync();
    }
}
