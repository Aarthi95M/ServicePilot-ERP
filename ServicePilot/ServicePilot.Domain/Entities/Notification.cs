using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class Notification
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Guid? UserId { get; set; }

    public string Title { get; set; } = null!;

    public string? Message { get; set; }

    public string? Type { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Company Company { get; set; } = null!;

    public virtual User? User { get; set; }
}
