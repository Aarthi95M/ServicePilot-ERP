using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.DTOs.SuperAdmin;
using ServicePilot.Application.Interfaces.Services;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/superadmin")]
    public class SuperAdminController : ControllerBase
    {
        private readonly ISuperAdminService _service;

        public SuperAdminController(ISuperAdminService service)
        {
            _service = service;
        }

        /// <summary>
        /// Onboard a new client company.
        /// Creates the company + first Admin user in a single transaction.
        /// Also seeds default app_settings (shift time, grace period, etc).
        ///
        /// SECURITY: Protect this endpoint with an API key header in production.
        /// Add: [ApiKey] attribute or configure in middleware.
        /// </summary>
        [HttpPost("onboard")]
        [AllowAnonymous]   // Temporarily — replace with API key auth in production
        public async Task<IActionResult> OnboardCompany([FromBody] CreateCompanyDto dto)
        {
            var response = await _service.OnboardCompanyAsync(dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Deactivate a company (e.g. subscription cancelled).
        /// Does NOT delete data — sets is_active = false.
        /// </summary>
        [HttpPut("{companyId:guid}/deactivate")]
        [AllowAnonymous]   // Temporarily — replace with API key auth in production
        public async Task<IActionResult> DeactivateCompany(Guid companyId)
        {
            var response = await _service.DeactivateCompanyAsync(companyId);
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}
