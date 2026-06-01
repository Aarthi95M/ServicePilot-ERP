using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Entities;
using ServicePilot.Infrastructure.Persistence.Models;
using ServicePilot.Shared.Responses;

namespace ServicePilot.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public NotificationsController(AppDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    /// <summary>Get notifications for the current user (latest 50).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _context.Notifications
            .AsNoTracking()
            .Where(n =>
                n.CompanyId == _currentUser.CompanyId &&
                (n.UserId == null || n.UserId == _currentUser.UserId))
            .OrderByDescending(n => n.CreatedAt);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new
            {
                n.Id,
                n.Title,
                n.Message,
                n.Type,
                n.IsRead,
                n.CreatedAt
            })
            .ToListAsync();

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Data = new { items, totalCount = total, page, pageSize },
            Message = string.Empty
        });
    }

    /// <summary>Unread notification count for the bell badge.</summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await _context.Notifications
            .CountAsync(n =>
                n.CompanyId == _currentUser.CompanyId &&
                (n.UserId == null || n.UserId == _currentUser.UserId) &&
                !n.IsRead);

        return Ok(new ApiResponse<int> { Success = true, Data = count, Message = string.Empty });
    }

    /// <summary>Mark a single notification as read.</summary>
    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var n = await _context.Notifications.FirstOrDefaultAsync(x =>
            x.Id == id &&
            x.CompanyId == _currentUser.CompanyId &&
            (x.UserId == null || x.UserId == _currentUser.UserId));

        if (n == null)
            return NotFound(new { success = false, message = "Notification not found." });

        n.IsRead = true;
        n.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }

    /// <summary>Mark all notifications as read.</summary>
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var notifications = await _context.Notifications
            .Where(n =>
                n.CompanyId == _currentUser.CompanyId &&
                (n.UserId == null || n.UserId == _currentUser.UserId) &&
                !n.IsRead)
            .ToListAsync();

        foreach (var n in notifications)
        {
            n.IsRead = true;
            n.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new { success = true, count = notifications.Count });
    }
}
