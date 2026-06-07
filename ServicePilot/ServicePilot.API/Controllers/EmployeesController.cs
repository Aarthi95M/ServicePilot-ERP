using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.DTOs.Employees;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EmployeesController : ControllerBase
    {
        private readonly IEmployeeService _service;

        public EmployeesController(IEmployeeService service)
        {
            _service = service;
        }

        /// <summary>
        /// Returns the employee profile linked to the currently authenticated user.
        /// Used by the mobile app — accessible to all authenticated users (any role).
        /// Returns 404 if the user's account is not linked to an employee record.
        /// </summary>
        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var response = await _service.GetMyProfileAsync();
            return response.Success ? Ok(response) : NotFound(response);
        }

        /// <summary>
        /// Paged employee list with filters.
        /// HR Manager added — they need this for managing employee profiles.
        /// Dispatcher added — they need to see who is available for job assignment.
        /// Supervisor already had access.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = Roles.EmployeeReadAccess)]  // Admin,HRManager,Supervisor,Dispatcher
        public async Task<IActionResult> GetPaged([FromQuery] PagedEmployeeRequest filter)
        {
            var response = await _service.GetPagedAsync(filter);
            return Ok(response);
        }

        /// <summary>
        /// Full employee detail — HR documents included.
        /// Dispatcher can view but cannot edit (enforced at service layer).
        /// </summary>
        [HttpGet("{id:guid}")]
        [Authorize(Roles = Roles.EmployeeReadAccess)]  // Admin,HRManager,Supervisor,Dispatcher
        public async Task<IActionResult> GetById(Guid id)
        {
            var response = await _service.GetByIdAsync(id);
            return response.Success ? Ok(response) : NotFound(response);
        }

        /// <summary>
        /// Employees with expiring visa/passport/Emirates ID.
        /// HR Manager is the primary user of this endpoint.
        /// </summary>
        [HttpGet("expiring-documents")]
        [Authorize(Roles = Roles.HRAccess)]            // Admin,HRManager
        public async Task<IActionResult> GetExpiringDocuments([FromQuery] int days = 30)
        {
            var response = await _service.GetExpiringDocumentsAsync(days);
            return Ok(response);
        }

        /// <summary>
        /// Create employee.
        /// HRManager added — their core job is managing employee records.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = Roles.HRAccess)]            // Admin,HRManager
        public async Task<IActionResult> Create([FromBody] CreateEmployeeDto dto)
        {
            var response = await _service.CreateAsync(dto);
            return response.Success
                ? CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response)
                : BadRequest(response);
        }

        /// <summary>
        /// Update employee.
        /// HRManager added. Supervisor still allowed but locked from HR docs at service layer.
        /// HR doc lock logic: CanEditHRDocuments() in EmployeeService.UpdateAsync.
        /// </summary>
        [HttpPut("{id:guid}")]
        [Authorize(Roles = "Admin,HRManager,Supervisor")] // Dispatcher cannot edit
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEmployeeDto dto)
        {
            var response = await _service.UpdateAsync(id, dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Deactivate employee (soft delete).
        /// Only Admin and HR Manager — Supervisor cannot deactivate employees.
        /// </summary>
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = Roles.HRAccess)]            // Admin,HRManager
        public async Task<IActionResult> Delete(Guid id)
        {
            var response = await _service.DeleteAsync(id);
            return response.Success ? Ok(response) : NotFound(response);
        }

        /// <summary>
        /// One-shot shortcut: creates an Employee record AND a linked
        /// Technician OR Supervisor user account (mobile login) in a single
        /// atomic transaction. Avoids the two-step "create employee then
        /// create user" workflow for field staff. These are the only two
        /// roles that need both an Employee profile and mobile app access —
        /// Admin/HRManager/Dispatcher don't need Employee profiles and are
        /// created directly via User Management.
        /// Only Admin and HR Manager can use this endpoint.
        /// </summary>
        [HttpPost("create-technician")]
        [Authorize(Roles = Roles.HRAccess)]            // Admin,HRManager
        public async Task<IActionResult> CreateTechnician(
            [FromBody] CreateTechnicianDto dto)
        {
            var response = await _service.CreateTechnicianAsync(dto);
            return response.Success
                ? CreatedAtAction(
                    nameof(GetById),
                    new { id = response.Data!.EmployeeId },
                    response)
                : BadRequest(response);
        }
    }
}
