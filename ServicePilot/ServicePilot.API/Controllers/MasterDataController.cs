using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;
using ServicePilot.Domain.Entities;
using ServicePilot.Infrastructure.Persistence.Models;
using ServicePilot.Shared.Responses;

namespace ServicePilot.API.Controllers;

/// <summary>
/// CRUD management for master-data tables: Job Types, Job Statuses, Leave Types.
/// Branches / Departments / Positions are managed via OrgStructureController.
/// </summary>
[ApiController]
[Route("api/master")]
[Authorize]
public class MasterDataController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public MasterDataController(AppDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    // ════════════════════════════════════════════════════════════════
    // JOB TYPES
    // ════════════════════════════════════════════════════════════════

    [HttpGet("job-types")]
    [Authorize(Roles = Roles.JobReadAccess)]
    public async Task<IActionResult> GetJobTypes()
    {
        var items = await _context.JobTypes
            .AsNoTracking()
            .Where(x => x.CompanyId == _currentUser.CompanyId)
            .OrderBy(x => x.Name)
            .Select(x => new { x.Id, x.Name, x.EstimatedDurationMins, x.IsActive, x.CreatedAt })
            .ToListAsync();

        return Ok(new ApiResponse<object> { Success = true, Data = items, Message = string.Empty });
    }

    [HttpPost("job-types")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> CreateJobType([FromBody] UpsertJobTypeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { success = false, message = "Name is required." });

        var entity = new JobType
        {
            Id = Guid.NewGuid(),
            CompanyId = _currentUser.CompanyId,
            Name = dto.Name.Trim(),
            EstimatedDurationMins = dto.EstimatedDurationMins,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _context.JobTypes.AddAsync(entity);
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Data = new { entity.Id, entity.Name, entity.EstimatedDurationMins, entity.IsActive },
            Message = "Job type created."
        });
    }

    [HttpPut("job-types/{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdateJobType(Guid id, [FromBody] UpsertJobTypeDto dto)
    {
        var entity = await _context.JobTypes.FirstOrDefaultAsync(x =>
            x.Id == id && x.CompanyId == _currentUser.CompanyId);

        if (entity == null) return NotFound(new { success = false, message = "Not found." });

        entity.Name = dto.Name?.Trim() ?? entity.Name;
        entity.EstimatedDurationMins = dto.EstimatedDurationMins;
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new ApiResponse<object>
        {
            Success = true,
            Data = new { entity.Id, entity.Name, entity.EstimatedDurationMins, entity.IsActive },
            Message = "Updated."
        });
    }

    [HttpDelete("job-types/{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DeleteJobType(Guid id)
    {
        var entity = await _context.JobTypes.FirstOrDefaultAsync(x =>
            x.Id == id && x.CompanyId == _currentUser.CompanyId);

        if (entity == null) return NotFound(new { success = false, message = "Not found." });

        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }

    // ════════════════════════════════════════════════════════════════
    // JOB STATUSES
    // ════════════════════════════════════════════════════════════════

    [HttpGet("job-statuses")]
    [Authorize(Roles = Roles.JobReadAccess)]
    public async Task<IActionResult> GetJobStatuses()
    {
        var items = await _context.JobStatuses
            .AsNoTracking()
            .Where(x => x.CompanyId == _currentUser.CompanyId)
            .OrderBy(x => x.DisplayOrder)
            .Select(x => new { x.Id, x.Name, x.DisplayOrder, x.ColorCode, x.IsActive, x.CreatedAt })
            .ToListAsync();

        return Ok(new ApiResponse<object> { Success = true, Data = items, Message = string.Empty });
    }

    [HttpPost("job-statuses")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> CreateJobStatus([FromBody] UpsertJobStatusDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { success = false, message = "Name is required." });

        var maxOrder = await _context.JobStatuses
            .Where(x => x.CompanyId == _currentUser.CompanyId)
            .MaxAsync(x => (int?)x.DisplayOrder) ?? 0;

        var entity = new JobStatus
        {
            Id = Guid.NewGuid(),
            CompanyId = _currentUser.CompanyId,
            Name = dto.Name.Trim(),
            DisplayOrder = maxOrder + 1,
            ColorCode = dto.ColorCode ?? "#94a3b8",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _context.JobStatuses.AddAsync(entity);
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Data = new { entity.Id, entity.Name, entity.DisplayOrder, entity.ColorCode, entity.IsActive },
            Message = "Job status created."
        });
    }

    [HttpPut("job-statuses/{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdateJobStatus(Guid id, [FromBody] UpsertJobStatusDto dto)
    {
        var entity = await _context.JobStatuses.FirstOrDefaultAsync(x =>
            x.Id == id && x.CompanyId == _currentUser.CompanyId);

        if (entity == null) return NotFound(new { success = false, message = "Not found." });

        entity.Name = dto.Name?.Trim() ?? entity.Name;
        entity.ColorCode = dto.ColorCode ?? entity.ColorCode;
        entity.DisplayOrder = dto.DisplayOrder > 0 ? dto.DisplayOrder : entity.DisplayOrder;
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new ApiResponse<object>
        {
            Success = true,
            Data = new { entity.Id, entity.Name, entity.DisplayOrder, entity.ColorCode, entity.IsActive },
            Message = "Updated."
        });
    }

    [HttpDelete("job-statuses/{id:guid}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DeleteJobStatus(Guid id)
    {
        var entity = await _context.JobStatuses.FirstOrDefaultAsync(x =>
            x.Id == id && x.CompanyId == _currentUser.CompanyId);

        if (entity == null) return NotFound(new { success = false, message = "Not found." });

        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }

    // ════════════════════════════════════════════════════════════════
    // LEAVE TYPES
    // ════════════════════════════════════════════════════════════════

    [HttpGet("leave-types")]
    [Authorize(Roles = Roles.HRAccess)]
    public async Task<IActionResult> GetLeaveTypes()
    {
        var items = await _context.LeaveTypes
            .AsNoTracking()
            .Where(x => x.CompanyId == _currentUser.CompanyId)
            .OrderBy(x => x.Name)
            .Select(x => new { x.Id, x.Name, x.MaxDaysPerYear, x.IsPaid, x.IsActive, x.CreatedAt })
            .ToListAsync();

        return Ok(new ApiResponse<object> { Success = true, Data = items, Message = string.Empty });
    }

    [HttpPost("leave-types")]
    [Authorize(Roles = Roles.HRAccess)]
    public async Task<IActionResult> CreateLeaveType([FromBody] UpsertLeaveTypeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { success = false, message = "Name is required." });

        var entity = new LeaveType
        {
            Id = Guid.NewGuid(),
            CompanyId = _currentUser.CompanyId,
            Name = dto.Name.Trim(),
            MaxDaysPerYear = dto.MaxDaysPerYear > 0 ? dto.MaxDaysPerYear : 0,
            IsPaid = dto.IsPaid,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _context.LeaveTypes.AddAsync(entity);
        await _context.SaveChangesAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Data = new { entity.Id, entity.Name, entity.MaxDaysPerYear, entity.IsPaid, entity.IsActive },
            Message = "Leave type created."
        });
    }

    [HttpPut("leave-types/{id:guid}")]
    [Authorize(Roles = Roles.HRAccess)]
    public async Task<IActionResult> UpdateLeaveType(Guid id, [FromBody] UpsertLeaveTypeDto dto)
    {
        var entity = await _context.LeaveTypes.FirstOrDefaultAsync(x =>
            x.Id == id && x.CompanyId == _currentUser.CompanyId);

        if (entity == null) return NotFound(new { success = false, message = "Not found." });

        entity.Name = dto.Name?.Trim() ?? entity.Name;
        entity.MaxDaysPerYear = dto.MaxDaysPerYear > 0 ? dto.MaxDaysPerYear : entity.MaxDaysPerYear;
        entity.IsPaid = dto.IsPaid;
        entity.IsActive = dto.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new ApiResponse<object>
        {
            Success = true,
            Data = new { entity.Id, entity.Name, entity.MaxDaysPerYear, entity.IsPaid, entity.IsActive },
            Message = "Updated."
        });
    }

    [HttpDelete("leave-types/{id:guid}")]
    [Authorize(Roles = Roles.HRAccess)]
    public async Task<IActionResult> DeleteLeaveType(Guid id)
    {
        var entity = await _context.LeaveTypes.FirstOrDefaultAsync(x =>
            x.Id == id && x.CompanyId == _currentUser.CompanyId);

        if (entity == null) return NotFound(new { success = false, message = "Not found." });

        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }
}

// ── Request DTOs (lightweight, inline for this controller) ───────────────────

public class UpsertJobTypeDto
{
    public string Name { get; set; } = string.Empty;
    public int? EstimatedDurationMins { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpsertJobStatusDto
{
    public string Name { get; set; } = string.Empty;
    public string? ColorCode { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpsertLeaveTypeDto
{
    public string Name { get; set; } = string.Empty;
    public int MaxDaysPerYear { get; set; }
    public bool IsPaid { get; set; }
    public bool IsActive { get; set; } = true;
}
