using ServicePilot.Application.DTOs.Reports;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface IReportService
    {
        Task<ApiResponse<AttendanceReportDto>> GetAttendanceReportAsync(
            DateOnly from, DateOnly to,
            Guid? branchId, Guid? departmentId);

        Task<ApiResponse<JobReportDto>> GetJobReportAsync(
            DateOnly from, DateOnly to,
            Guid? branchId);

        Task<ApiResponse<LeaveReportDto>> GetLeaveReportAsync(
            int year,
            Guid? branchId, Guid? departmentId);

        Task<ApiResponse<ExpiryReportDto>> GetExpiryReportAsync(int days);
    }
}
