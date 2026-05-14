using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.DTOs.Employees;
using ServicePilot.Application.Interfaces.Services;

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

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] EmployeeFilterDto filter)
        {
            var response = await _service.GetAllAsync(filter);

            return Ok(response);
        }

        [HttpGet("paged")]
        public async Task<IActionResult> GetPaged([FromQuery] PagedEmployeeRequest filter)
        {
            var response = await _service.GetPagedAsync(filter);
            return Ok(response);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> Create(
            CreateEmployeeDto dto)
        {
            var response = await _service.CreateAsync(dto);

            return Ok(response);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Supervisor")]
        public async Task<IActionResult> Update(Guid id,UpdateEmployeeDto dto)
        {
            var response = await _service.UpdateAsync(id, dto);
            return Ok(response);
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var response = await _service.DeleteAsync(id);
            return Ok(response);
        }
    }
}
