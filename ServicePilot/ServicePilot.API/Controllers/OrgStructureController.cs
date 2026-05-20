using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.DTOs.OrgStructure;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/org")]
    [Authorize]
    public class OrgStructureController : ControllerBase
    {
        private readonly IOrgStructureService _service;

        public OrgStructureController(IOrgStructureService service)
        {
            _service = service;
        }

        // ── BRANCHES ──────────────────────────────────────────────────

        [HttpGet("branches")]
        [Authorize(Roles = Roles.EmployeeReadAccess)]   // Admin,HRManager,Supervisor,Dispatcher
        public async Task<IActionResult> GetBranches()
        {
            var r = await _service.GetBranchesAsync();
            return Ok(r);
        }

        [HttpGet("branches/{id:guid}")]
        [Authorize(Roles = Roles.EmployeeReadAccess)]
        public async Task<IActionResult> GetBranch(Guid id)
        {
            var r = await _service.GetBranchByIdAsync(id);
            return r.Success ? Ok(r) : NotFound(r);
        }

        [HttpPost("branches")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> CreateBranch([FromBody] CreateBranchDto dto)
        {
            var r = await _service.CreateBranchAsync(dto);
            return r.Success ? Ok(r) : BadRequest(r);
        }

        [HttpPut("branches/{id:guid}")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> UpdateBranch(Guid id, [FromBody] UpdateBranchDto dto)
        {
            var r = await _service.UpdateBranchAsync(id, dto);
            return r.Success ? Ok(r) : BadRequest(r);
        }

        [HttpDelete("branches/{id:guid}")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> DeactivateBranch(Guid id)
        {
            var r = await _service.DeactivateBranchAsync(id);
            return r.Success ? Ok(r) : BadRequest(r);
        }

        // ── DEPARTMENTS ───────────────────────────────────────────────

        [HttpGet("departments")]
        [Authorize(Roles = Roles.EmployeeReadAccess)]
        public async Task<IActionResult> GetDepartments()
        {
            var r = await _service.GetDepartmentsAsync();
            return Ok(r);
        }

        [HttpPost("departments")]
        [Authorize(Roles = Roles.HRAccess)]             // Admin, HRManager
        public async Task<IActionResult> CreateDepartment([FromBody] CreateDepartmentDto dto)
        {
            var r = await _service.CreateDepartmentAsync(dto);
            return r.Success ? Ok(r) : BadRequest(r);
        }

        [HttpPut("departments/{id:guid}")]
        [Authorize(Roles = Roles.HRAccess)]
        public async Task<IActionResult> UpdateDepartment(
            Guid id, [FromBody] UpdateDepartmentDto dto)
        {
            var r = await _service.UpdateDepartmentAsync(id, dto);
            return r.Success ? Ok(r) : BadRequest(r);
        }

        [HttpDelete("departments/{id:guid}")]
        [Authorize(Roles = Roles.HRAccess)]
        public async Task<IActionResult> DeactivateDepartment(Guid id)
        {
            var r = await _service.DeactivateDepartmentAsync(id);
            return r.Success ? Ok(r) : BadRequest(r);
        }

        // ── POSITIONS ─────────────────────────────────────────────────

        [HttpGet("positions")]
        [Authorize(Roles = Roles.EmployeeReadAccess)]
        public async Task<IActionResult> GetPositions()
        {
            var r = await _service.GetPositionsAsync();
            return Ok(r);
        }

        [HttpPost("positions")]
        [Authorize(Roles = Roles.HRAccess)]
        public async Task<IActionResult> CreatePosition([FromBody] CreatePositionDto dto)
        {
            var r = await _service.CreatePositionAsync(dto);
            return r.Success ? Ok(r) : BadRequest(r);
        }

        [HttpPut("positions/{id:guid}")]
        [Authorize(Roles = Roles.HRAccess)]
        public async Task<IActionResult> UpdatePosition(
            Guid id, [FromBody] UpdatePositionDto dto)
        {
            var r = await _service.UpdatePositionAsync(id, dto);
            return r.Success ? Ok(r) : BadRequest(r);
        }

        [HttpDelete("positions/{id:guid}")]
        [Authorize(Roles = Roles.HRAccess)]
        public async Task<IActionResult> DeactivatePosition(Guid id)
        {
            var r = await _service.DeactivatePositionAsync(id);
            return r.Success ? Ok(r) : BadRequest(r);
        }
    }
}
