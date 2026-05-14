using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.Interfaces.Services;

namespace ServicePilot.API.Controllers;

[ApiController]
[Route("api/lookups")]
[Authorize]
public class LookupsController : ControllerBase
{
    private readonly ILookupService _lookupService;

    public LookupsController(
        ILookupService lookupService)
    {
        _lookupService = lookupService;
    }

    [HttpGet("employees")]
    public async Task<IActionResult> GetEmployees()
    {
        var response =
            await _lookupService.GetEmployeesAsync();

        return Ok(response);
    }

    [HttpGet("branches")]
    public async Task<IActionResult> GetBranches()
    {
        var response =
            await _lookupService.GetBranchesAsync();

        return Ok(response);
    }

    [HttpGet("departments")]
    public async Task<IActionResult> GetDepartments()
    {
        var response =
            await _lookupService.GetDepartmentsAsync();

        return Ok(response);
    }

    [HttpGet("positions")]
    public async Task<IActionResult> GetPositions()
    {
        var response =
            await _lookupService.GetPositionsAsync();

        return Ok(response);
    }
}