namespace ServicePilot.Domain.Entities;

public class AuditLog
{
    public Guid Id { get; set; }

    public string TableName { get; set; } = string.Empty;

    public Guid RecordId { get; set; }

    public string Action { get; set; } = string.Empty;

    public string? OldValues { get; set; }

    public string? NewValues { get; set; }

    public Guid UserId { get; set; }

    public DateTime CreatedAt { get; set; }
}