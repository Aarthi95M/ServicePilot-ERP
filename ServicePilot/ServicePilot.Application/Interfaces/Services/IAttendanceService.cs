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
        Task<ApiResponse<PagedResult<AttendanceResponseDto>>> GetMyHistoryAsync(int page, int pageSize);
        Task<ApiResponse<AttendanceDashboardDto>> GetDashboardAsync();
        Task<ApiResponse<PagedResult<AttendanceResponseDto>>> GetPagedAsync(PagedAttendanceRequest filter);
        Task<ApiResponse<IEnumerable<AttendanceSummaryDto>>> GetSummaryAsync(
            DateOnly from, DateOnly to, Guid? branchId, Guid? departmentId);
        Task<ApiResponse<bool>> LogGpsAsync(GpsLogRequestDto dto);
        Task<ApiResponse<IEnumerable<LiveLocationDto>>> GetLiveLocationsAsync();

        /// <summary>
        /// Supervisor / Admin manual adjustment of an attendance record.
        /// Allows correcting check-in time, check-out time, or clearing
        /// checkout so the employee can re-check-out via mobile.
        /// Supervisor access is scoped to their own branch.
        /// </summary>
        Task<ApiResponse<AttendanceResponseDto>> AdjustAttendanceAsync(
            Guid recordId, AdjustAttendanceRequestDto dto);

        /// <summary>
        /// Admin / Supervisor creates a manual attendance record for an employee
        /// who forgot to check in. Supervisor access scoped to their branch.
        /// </summary>
        Task<ApiResponse<AttendanceResponseDto>> CreateManualAsync(
            CreateManualAttendanceDto dto);
    }
}
