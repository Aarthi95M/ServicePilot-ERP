using ServicePilot.Application.DTOs.Dashboard;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface IDashboardService
    {
        Task<ApiResponse<AdminDashboardDto>> GetAdminDashboardAsync();
        Task<ApiResponse<SupervisorDashboardDto>> GetSupervisorDashboardAsync();
        Task<ApiResponse<TechnicianDashboardDto>> GetTechnicianDashboardAsync();
    }
}
