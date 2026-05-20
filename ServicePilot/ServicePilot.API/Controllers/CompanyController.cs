using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.DTOs.Companies;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CompanyController : ControllerBase
    {
        private readonly ICompanyService _service;

        public CompanyController(ICompanyService service)
        {
            _service = service;
        }

        /// <summary>
        /// Get current company profile with employee, branch, and user counts.
        /// GET /api/company/me
        /// </summary>
        [HttpGet("me")]
        [Authorize(Roles = Roles.HRAccess)]             // Admin, HRManager
        public async Task<IActionResult> GetMyCompany()
        {
            var response = await _service.GetMyCompanyAsync();
            return response.Success ? Ok(response) : NotFound(response);
        }

        /// <summary>
        /// Update company profile (name, email, phone, address, timezone, logo).
        /// PUT /api/company/me
        /// </summary>
        [HttpPut("me")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> UpdateMyCompany([FromBody] UpdateCompanyDto dto)
        {
            var response = await _service.UpdateMyCompanyAsync(dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Get company configuration (shift time, grace period, working days).
        /// GET /api/company/config
        /// </summary>
        [HttpGet("config")]
        [Authorize(Roles = Roles.HRAccess)]             // Admin, HRManager
        public async Task<IActionResult> GetConfig()
        {
            var response = await _service.GetConfigAsync();
            return Ok(response);
        }

        /// <summary>
        /// Update company configuration.
        /// PUT /api/company/config
        /// </summary>
        [HttpPut("config")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> UpdateConfig([FromBody] CompanyConfigDto dto)
        {
            var response = await _service.UpdateConfigAsync(dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}
