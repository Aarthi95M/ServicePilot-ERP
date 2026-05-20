using ServicePilot.Application.DTOs.Attendance;
using ServicePilot.Application.DTOs.GPS;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface IAttendanceService
    {
        Task<ApiResponse<AttendanceResponseDto>> CheckInAsync(CheckInRequestDto dto);
        Task<ApiResponse<AttendanceResponseDto>> CheckOutAsync(CheckOutRequestDto dto);
        Task<ApiResponse<AttendanceResponseDto>> GetTodayForEmployeeAsync();
        Task<ApiResponse<AttendanceDashboardDto>> GetDashboardAsync();
        Task<ApiResponse<PagedResult<AttendanceResponseDto>>> GetPagedAsync(PagedAttendanceRequest filter);
        Task<ApiResponse<IEnumerable<AttendanceSummaryDto>>> GetSummaryAsync(
            DateOnly from, DateOnly to, Guid? branchId, Guid? departmentId);
        Task<ApiResponse<bool>> LogGpsAsync(GpsLogRequestDto dto);
    }
}
