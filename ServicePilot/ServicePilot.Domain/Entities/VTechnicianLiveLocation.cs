using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class VTechnicianLiveLocation
{
    public Guid? EmployeeId { get; set; }

    public Guid? CompanyId { get; set; }

    public string? FullName { get; set; }

    public string? PhoneNumber { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public decimal? Accuracy { get; set; }

    public DateTime? RecordedAt { get; set; }
}
