using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class JobStatus
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public string Name { get; set; } = null!;

    public int DisplayOrder { get; set; }

    public string? ColorCode { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Company Company { get; set; } = null!;

    public virtual ICollection<JobStatusHistory> JobStatusHistoryNewStatuses { get; set; } = new List<JobStatusHistory>();

    public virtual ICollection<JobStatusHistory> JobStatusHistoryOldStatuses { get; set; } = new List<JobStatusHistory>();

    public virtual ICollection<Job> Jobs { get; set; } = new List<Job>();
}
