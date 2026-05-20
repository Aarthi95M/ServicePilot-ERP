using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;

namespace ServicePilot.API.Controllers;

[ApiController]
[Route("api/lookups")]
[Authorize]
public class LookupsController : ControllerBase
{
    private readonly ILookupService _lookupService;

    public LookupsController(ILookupService lookupService)
    {
        _lookupService = lookupService;
    }

    // All lookup endpoints use Roles.AllRoles so every authenticated
    // role can populate dropdowns. Restricting lookups would break
    // UIs for Dispatcher and HR Manager.

    [HttpGet("employees")]
    [Authorize(Roles = Roles.EmployeeReadAccess)]  // Admin,HRManager,Supervisor,Dispatcher
    public async Task<IActionResult> GetEmployees()
    {
        var response = await _lookupService.GetEmployeesAsync();
        return Ok(response);
    }

    [HttpGet("branches")]
    [Authorize(Roles = Roles.AllRoles)]
    public async Task<IActionResult> GetBranches()
    {
        var response = await _lookupService.GetBranchesAsync();
        return Ok(response);
    }

    [HttpGet("departments")]
    [Authorize(Roles = Roles.AllRoles)]
    public async Task<IActionResult> GetDepartments()
    {
        var response = await _lookupService.GetDepartmentsAsync();
        return Ok(response);
    }

    [HttpGet("positions")]
    [Authorize(Roles = Roles.AllRoles)]
    public async Task<IActionResult> GetPositions()
    {
        var response = await _lookupService.GetPositionsAsync();
        return Ok(response);
    }

    [HttpGet("job-statuses")]
    [Authorize(Roles = Roles.JobReadAccess)]       // Admin,Supervisor,Dispatcher,Employee
    public async Task<IActionResult> GetJobStatuses()
    {
        var response = await _lookupService.GetJobStatusesAsync();
        return Ok(response);
    }

    [HttpGet("job-types")]
    [Authorize(Roles = Roles.JobReadAccess)]       // Admin,Supervisor,Dispatcher,Employee
    public async Task<IActionResult> GetJobTypes()
    {
        var response = await _lookupService.GetJobTypesAsync();
        return Ok(response);
    }

    [HttpGet("leave-types")]
    [Authorize(Roles = Roles.AllRoles)]
    public async Task<IActionResult> GetLeaveTypes()
    {
        var response = await _lookupService.GetLeaveTypesAsync();
        return Ok(response);
    }
}