using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _service;

        public ReportsController(IReportService service)
        {
            _service = service;
        }

        /// <summary>
        /// Attendance report for a date range (max 90 days).
        /// Per-employee: present/late/absent days, total hours, avg check-in time.
        /// GET /api/reports/attendance?from=2026-05-01&to=2026-05-31
        /// </summary>
        [HttpGet("attendance")]
        [Authorize(Roles = Roles.AttendanceReadAccess)]  // Admin, HRManager, Supervisor
        public async Task<IActionResult> GetAttendanceReport(
            [FromQuery] DateOnly from,
            [FromQuery] DateOnly to,
            [FromQuery] Guid? branchId = null,
            [FromQuery] Guid? departmentId = null)
        {
            var response = await _service.GetAttendanceReportAsync(
                from, to, branchId, departmentId);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Job completion report for a date range (max 90 days).
        /// Per-technician: total assigned, completed, in-progress, avg duration.
        /// GET /api/reports/jobs?from=2026-05-01&to=2026-05-31
        /// </summary>
        [HttpGet("jobs")]
        [Authorize(Roles = Roles.JobWriteAccess)]  // Admin, Supervisor, Dispatcher
        public async Task<IActionResult> GetJobReport(
            [FromQuery] DateOnly from,
            [FromQuery] DateOnly to,
            [FromQuery] Guid? branchId = null)
        {
            var response = await _service.GetJobReportAsync(from, to, branchId);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Leave and overtime report for a full year.
        /// Per-employee: approved leave days, overtime hours, rejection counts.
        /// GET /api/reports/leave?year=2026
        /// </summary>
        [HttpGet("leave")]
        [Authorize(Roles = Roles.AttendanceReadAccess)]  // Admin, HRManager, Supervisor
        public async Task<IActionResult> GetLeaveReport(
            [FromQuery] int year = 0,
            [FromQuery] Guid? branchId = null,
            [FromQuery] Guid? departmentId = null)
        {
            if (year == 0) year = DateTime.UtcNow.Year;
            var response = await _service.GetLeaveReportAsync(year, branchId, departmentId);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Document expiry report — visa, passport, Emirates ID.
        /// Returns employees with any document expiring within the threshold.
        /// GET /api/reports/expiry?days=30
        /// </summary>
        [HttpGet("expiry")]
        [Authorize(Roles = Roles.HRAccess)]              // Admin, HRManager
        public async Task<IActionResult> GetExpiryReport([FromQuery] int days = 30)
        {
            var response = await _service.GetExpiryReportAsync(days);
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}
