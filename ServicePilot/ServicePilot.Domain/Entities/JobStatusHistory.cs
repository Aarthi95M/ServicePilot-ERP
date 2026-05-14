using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class JobStatusHistory
{
    public Guid Id { get; set; }

    public Guid JobId { get; set; }

    public Guid? OldStatusId { get; set; }

    public Guid? NewStatusId { get; set; }

    public Guid? ChangedBy { get; set; }

    public DateTime ChangedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? ChangedByNavigation { get; set; }

    public virtual Job Job { get; set; } = null!;

    public virtual JobStatus? NewStatus { get; set; }

    public virtual JobStatus? OldStatus { get; set; }
}
