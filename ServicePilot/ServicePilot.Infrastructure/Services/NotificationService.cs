using Microsoft.Extensions.Logging;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Entities;
using ServicePilot.Infrastructure.Persistence.Models;

namespace ServicePilot.Infrastructure.Services;

/// <summary>
/// Writes rows to the notifications table.
/// Services call this after committing their main business change so
/// notification failures never roll back the primary operation.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(AppDbContext context, ILogger<NotificationService> logger)
    {
        _context = context;
        _logger  = logger;
    }

    public async Task NotifyUserAsync(
        Guid companyId,
        Guid userId,
        string title,
        string message,
        string type = "system")
    {
        await SaveAsync(companyId, userId, title, message, type);
    }

    public async Task NotifyCompanyAsync(
        Guid companyId,
        string title,
        string message,
        string type = "system")
    {
        // userId = null → all users in the company see it
        await SaveAsync(companyId, userId: null, title, message, type);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async Task SaveAsync(
        Guid companyId,
        Guid? userId,
        string title,
        string message,
        string type)
    {
        try
        {
            _context.Notifications.Add(new Notification
            {
                Id        = Guid.NewGuid(),
                CompanyId = companyId,
                UserId    = userId,
                Title     = title,
                Message   = message,
                Type      = type,
                IsRead    = false,
                CreatedAt = DateTime.UtcNow,
            });

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Log but never surface — notification failure must not break the caller.
            _logger.LogWarning(ex,
                "Failed to create notification for company {CompanyId} user {UserId}: {Title}",
                companyId, userId, title);
        }
    }
}
