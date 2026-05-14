using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class Job
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public string? JobNumber { get; set; }

    public string CustomerName { get; set; } = null!;

    public string? CustomerPhone { get; set; }

    public string? Address { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public Guid? JobTypeId { get; set; }

    public Guid? JobStatusId { get; set; }

    public Guid? AssignedEmployeeId { get; set; }

    public string Priority { get; set; } = null!;

    public DateTime? ScheduledAt { get; set; }

    public DateTime? ScheduledEndAt { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public string? Notes { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Employee? AssignedEmployee { get; set; }

    public virtual Company Company { get; set; } = null!;

    public virtual User? CreatedByNavigation { get; set; }

    public virtual ICollection<JobPhoto> JobPhotos { get; set; } = new List<JobPhoto>();

    public virtual JobStatus? JobStatus { get; set; }

    public virtual ICollection<JobStatusHistory> JobStatusHistories { get; set; } = new List<JobStatusHistory>();

    public virtual JobType? JobType { get; set; }
}
