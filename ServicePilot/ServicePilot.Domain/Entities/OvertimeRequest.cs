using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class OvertimeRequest
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Guid EmployeeId { get; set; }

    public DateOnly RequestDate { get; set; }

    public decimal HoursRequested { get; set; }

    public string? Reason { get; set; }

    public string Status { get; set; } = null!;

    public Guid? ApprovedBy { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User? ApprovedByNavigation { get; set; }

    public virtual Company Company { get; set; } = null!;

    public virtual Employee Employee { get; set; } = null!;
}
