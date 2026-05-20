using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.DTOs.Leave;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class LeaveController : ControllerBase
    {
        private readonly ILeaveService _service;

        public LeaveController(ILeaveService service)
        {
            _service = service;
        }

        /// <summary>
        /// Submit a leave request.
        /// Technician/Supervisor submit for themselves.
        /// Validates: leave type, date range, no overlaps, annual limit.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = Roles.CheckInAccess)]          // Admin,Supervisor,Technician
        public async Task<IActionResult> Create([FromBody] CreateLeaveRequestDto dto)
        {
            var response = await _service.CreateAsync(dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Get leave request by ID.
        /// Technician sees own only. Supervisor sees branch. Admin/HR see all.
        /// </summary>
        [HttpGet("{id:guid}")]
        [Authorize(Roles = Roles.AllRoles)]
        public async Task<IActionResult> GetById(Guid id)
        {
            var response = await _service.GetByIdAsync(id);
            return response.Success ? Ok(response) : NotFound(response);
        }

        /// <summary>
        /// Paged leave list with filters.
        /// GET /api/leave?status=Pending&page=1&pageSize=20
        /// </summary>
        [HttpGet]
        [Authorize(Roles = Roles.AttendanceReadAccess)]   // Admin,HRManager,Supervisor
        public async Task<IActionResult> GetPaged([FromQuery] PagedLeaveRequest filter)
        {
            var response = await _service.GetPagedAsync(filter);
            return Ok(response);
        }

        /// <summary>
        /// My leave requests — mobile app.
        /// Returns all requests for the logged-in employee.
        /// </summary>
        [HttpGet("my-requests")]
        [Authorize(Roles = Roles.AllRoles)]
        public async Task<IActionResult> GetMyRequests()
        {
            var response = await _service.GetMyRequestsAsync();
            return Ok(response);
        }

        /// <summary>
        /// Approve or reject a pending leave request.
        /// PUT /api/leave/{id}/action  body: { "status": "Approved" }
        /// </summary>
        [HttpPut("{id:guid}/action")]
        [Authorize(Roles = Roles.AttendanceReadAccess)]   // Admin,HRManager,Supervisor
        public async Task<IActionResult> ApproveReject(
            Guid id, [FromBody] ApproveRejectLeaveDto dto)
        {
            var response = await _service.ApproveRejectAsync(id, dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Cancel a pending leave request.
        /// Employee cancels their own. Admin/HR can cancel any.
        /// </summary>
        [HttpPut("{id:guid}/cancel")]
        [Authorize(Roles = Roles.AllRoles)]
        public async Task<IActionResult> Cancel(Guid id)
        {
            var response = await _service.CancelAsync(id);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Leave balance summary per employee for a given year.
        /// Shows days taken, pending, and remaining per leave type.
        /// GET /api/leave/summary?year=2026
        /// </summary>
        [HttpGet("summary")]
        [Authorize(Roles = Roles.AttendanceReadAccess)]   // Admin,HRManager,Supervisor
        public async Task<IActionResult> GetSummary(
            [FromQuery] int year = 0,
            [FromQuery] Guid? employeeId = null,
            [FromQuery] Guid? departmentId = null)
        {
            if (year == 0) year = DateTime.UtcNow.Year;
            var response = await _service.GetSummaryAsync(year, employeeId, departmentId);
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}
