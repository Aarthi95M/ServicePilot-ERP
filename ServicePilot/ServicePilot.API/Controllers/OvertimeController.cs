using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.DTOs.Overtime;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OvertimeController : ControllerBase
    {
        private readonly IOvertimeService _service;

        public OvertimeController(IOvertimeService service)
        {
            _service = service;
        }

        /// <summary>
        /// Submit an overtime request for a past date.
        /// Cannot submit for future dates. Max 30 days backdating.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = Roles.CheckInAccess)]          // Admin,Supervisor,Technician
        public async Task<IActionResult> Create([FromBody] CreateOvertimeRequestDto dto)
        {
            var response = await _service.CreateAsync(dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>Get overtime request by ID.</summary>
        [HttpGet("{id:guid}")]
        [Authorize(Roles = Roles.AllRoles)]
        public async Task<IActionResult> GetById(Guid id)
        {
            var response = await _service.GetByIdAsync(id);
            return response.Success ? Ok(response) : NotFound(response);
        }

        /// <summary>
        /// Paged overtime list with filters.
        /// GET /api/overtime?status=Pending&dateFrom=2026-05-01
        /// </summary>
        [HttpGet]
        [Authorize(Roles = Roles.AttendanceReadAccess)]   // Admin,HRManager,Supervisor
        public async Task<IActionResult> GetPaged([FromQuery] PagedOvertimeRequest filter)
        {
            var response = await _service.GetPagedAsync(filter);
            return Ok(response);
        }

        /// <summary>My overtime requests — mobile app.</summary>
        [HttpGet("my-requests")]
        [Authorize(Roles = Roles.AllRoles)]
        public async Task<IActionResult> GetMyRequests()
        {
            var response = await _service.GetMyRequestsAsync();
            return Ok(response);
        }

        /// <summary>
        /// Approve or reject a pending overtime request.
        /// PUT /api/overtime/{id}/action  body: { "status": "Approved" }
        /// </summary>
        [HttpPut("{id:guid}/action")]
        [Authorize(Roles = Roles.AttendanceReadAccess)]   // Admin,HRManager,Supervisor
        public async Task<IActionResult> ApproveReject(
            Guid id, [FromBody] ApproveRejectOvertimeDto dto)
        {
            var response = await _service.ApproveRejectAsync(id, dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>Cancel a pending overtime request.</summary>
        [HttpPut("{id:guid}/cancel")]
        [Authorize(Roles = Roles.AllRoles)]
        public async Task<IActionResult> Cancel(Guid id)
        {
            var response = await _service.CancelAsync(id);
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}
