using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class VTodayJob
{
    public Guid? Id { get; set; }

    public Guid? CompanyId { get; set; }

    public string? JobNumber { get; set; }

    public string? CustomerName { get; set; }

    public string? CustomerPhone { get; set; }

    public string? Address { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public string? JobType { get; set; }

    public string? JobStatus { get; set; }

    public string? StatusColor { get; set; }

    public string? TechnicianName { get; set; }

    public string? TechnicianPhone { get; set; }

    public DateTime? ScheduledAt { get; set; }

    public DateTime? ScheduledEndAt { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public string? Notes { get; set; }
}
