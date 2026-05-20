using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.DTOs.Users;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = Roles.HRAccess)]                 // Admin, HRManager
    public class UsersController : ControllerBase
    {
        private readonly IUserManagementService _service;

        public UsersController(IUserManagementService service)
        {
            _service = service;
        }

        /// <summary>Get all users in the company.</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var response = await _service.GetAllAsync();
            return Ok(response);
        }

        /// <summary>Get user by ID.</summary>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var response = await _service.GetByIdAsync(id);
            return response.Success ? Ok(response) : NotFound(response);
        }

        /// <summary>
        /// Create a new user account.
        /// Validates email uniqueness, role, branch, and employee link.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = Roles.Admin)]               // Admin only — HRManager cannot create users
        public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
        {
            var response = await _service.CreateAsync(dto);
            return response.Success
                ? CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response)
                : BadRequest(response);
        }

        /// <summary>
        /// Update user details, role, branch, and employee link.
        /// </summary>
        [HttpPut("{id:guid}")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserDto dto)
        {
            var response = await _service.UpdateAsync(id, dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Reset a user's password. Admin sets a new password for the user.
        /// PUT /api/users/{id}/reset-password
        /// </summary>
        [HttpPut("{id:guid}/reset-password")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> ResetPassword(
            Guid id, [FromBody] ResetPasswordDto dto)
        {
            var response = await _service.ResetPasswordAsync(id, dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Deactivate a user account. Cannot deactivate your own account.
        /// </summary>
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> Deactivate(Guid id)
        {
            var response = await _service.DeactivateAsync(id);
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}
