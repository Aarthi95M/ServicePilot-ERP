using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _service;

        public DashboardController(IDashboardService service)
        {
            _service = service;
        }

        /// <summary>
        /// Company-wide dashboard for Admin.
        /// Returns: header metrics, today's attendance, jobs by status,
        /// pending approvals, expiry alerts, active employees, upcoming jobs.
        /// GET /api/dashboard/admin
        /// </summary>
        [HttpGet("admin")]
        [Authorize(Roles = Roles.HRAccess)]              // Admin, HRManager
        public async Task<IActionResult> GetAdminDashboard()
        {
            var response = await _service.GetAdminDashboardAsync();
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Branch-scoped dashboard for Supervisor.
        /// Returns same structure as admin dashboard but filtered to their branch.
        /// GET /api/dashboard/supervisor
        /// </summary>
        [HttpGet("supervisor")]
        [Authorize(Roles = Roles.Supervisor)]
        public async Task<IActionResult> GetSupervisorDashboard()
        {
            var response = await _service.GetSupervisorDashboardAsync();
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Personal dashboard for Technician — mobile app home screen.
        /// Returns: attendance status, my jobs, pending requests, document alerts.
        /// GET /api/dashboard/me
        /// </summary>
        [HttpGet("me")]
        [Authorize(Roles = Roles.CheckInAccess)]         // Admin, Supervisor, Technician
        public async Task<IActionResult> GetTechnicianDashboard()
        {
            var response = await _service.GetTechnicianDashboardAsync();
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}
