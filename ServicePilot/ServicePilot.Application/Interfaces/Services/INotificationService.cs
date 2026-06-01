namespace ServicePilot.Application.Interfaces.Services;

/// <summary>
/// Creates in-app notifications.
/// Inject this wherever a business event should notify users.
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Notify a specific user (e.g. "Your leave request was approved").
    /// </summary>
    Task NotifyUserAsync(
        Guid companyId,
        Guid userId,
        string title,
        string message,
        string type = "system");

    /// <summary>
    /// Broadcast a company-wide notification (e.g. "New leave request submitted").
    /// userId = null means all users in the company see it.
    /// </summary>
    Task NotifyCompanyAsync(
        Guid companyId,
        string title,
        string message,
        string type = "system");
}
