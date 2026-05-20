using ServicePilot.Application.DTOs.Overtime;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface IOvertimeService
    {
        Task<ApiResponse<OvertimeRequestResponseDto>> CreateAsync(CreateOvertimeRequestDto dto);
        Task<ApiResponse<OvertimeRequestResponseDto>> GetByIdAsync(Guid id);
        Task<ApiResponse<PagedResult<OvertimeRequestResponseDto>>> GetPagedAsync(PagedOvertimeRequest filter);
        Task<ApiResponse<IEnumerable<OvertimeRequestResponseDto>>> GetMyRequestsAsync();
        Task<ApiResponse<OvertimeRequestResponseDto>> ApproveRejectAsync(Guid id, ApproveRejectOvertimeDto dto);
        Task<ApiResponse<OvertimeRequestResponseDto>> CancelAsync(Guid id);
    }
}
