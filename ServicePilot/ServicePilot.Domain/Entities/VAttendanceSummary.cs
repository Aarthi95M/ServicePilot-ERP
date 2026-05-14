using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class VAttendanceSummary
{
    public Guid? CompanyId { get; set; }

    public Guid? EmployeeId { get; set; }

    public string? FullName { get; set; }

    public string? EmployeeCode { get; set; }

    public DateOnly? WorkDate { get; set; }

    public DateTime? CheckInTime { get; set; }

    public DateTime? CheckOutTime { get; set; }

    public decimal? HoursWorked { get; set; }

    public decimal? CheckInLat { get; set; }

    public decimal? CheckInLng { get; set; }
}
