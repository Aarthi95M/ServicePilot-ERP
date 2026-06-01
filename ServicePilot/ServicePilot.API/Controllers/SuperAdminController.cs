using Microsoft.AspNetCore.Mvc;
using ServicePilot.API.Middleware;
using ServicePilot.Application.DTOs.SuperAdmin;
using ServicePilot.Application.Interfaces.Services;

namespace ServicePilot.API.Controllers
{
    /// <summary>
    /// SuperAdmin endpoints — protected by X-Api-Key header.
    /// These routes are intentionally NOT protected by JWT (no company context exists yet
    /// when onboarding a new tenant), but they require a shared secret known only to the
    /// platform operator.
    ///
    /// Required header on every request:
    ///   X-Api-Key: <value of SuperAdmin:ApiKey in server configuration>
    ///
    /// In production, set this via environment variable:
    ///   SuperAdmin__ApiKey=<strong-random-value>
    /// </summary>
    [ApiController]
    [Route("api/superadmin")]
    [ApiKey]   // ← requires valid X-Api-Key header; see Middleware/ApiKeyAttribute.cs
    public class SuperAdminController : ControllerBase
    {
        private readonly ISuperAdminService _service;

        public SuperAdminController(ISuperAdminService service)
        {
            _service = service;
        }

        /// <summary>
        /// List all companies on the platform with user + employee counts.
        /// </summary>
        [HttpGet("companies")]
        public async Task<IActionResult> ListCompanies()
        {
            var response = await _service.ListCompaniesAsync();
            return Ok(response);
        }

        /// <summary>
        /// Onboard a new client company.
        /// Creates the company + first Admin user in a single transaction.
        /// Also seeds default app_settings (shift time, grace period, etc).
        /// </summary>
        [HttpPost("onboard")]
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
        public async Task<IActionResult> DeactivateCompany(Guid companyId)
        {
            var response = await _service.DeactivateCompanyAsync(companyId);
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}
