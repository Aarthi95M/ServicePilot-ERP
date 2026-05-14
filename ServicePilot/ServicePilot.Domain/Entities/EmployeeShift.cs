using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class EmployeeShift
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Guid EmployeeId { get; set; }

    public Guid ShiftTypeId { get; set; }

    public DateOnly ShiftDate { get; set; }

    public TimeOnly? CustomStartTime { get; set; }

    public TimeOnly? CustomEndTime { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Company Company { get; set; } = null!;

    public virtual Employee Employee { get; set; } = null!;

    public virtual ShiftType ShiftType { get; set; } = null!;
}
