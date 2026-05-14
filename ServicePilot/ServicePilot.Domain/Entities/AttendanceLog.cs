using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class AttendanceLog
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Guid EmployeeId { get; set; }

    public DateTime? CheckInTime { get; set; }

    public DateTime? CheckOutTime { get; set; }

    public decimal? CheckInLat { get; set; }

    public decimal? CheckInLng { get; set; }

    public decimal? CheckOutLat { get; set; }

    public decimal? CheckOutLng { get; set; }

    public string Status { get; set; } = null!;

    public bool IsOfflineSync { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Company Company { get; set; } = null!;

    public virtual Employee Employee { get; set; } = null!;
}
