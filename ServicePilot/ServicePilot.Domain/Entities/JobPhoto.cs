using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class JobPhoto
{
    public Guid Id { get; set; }

    public Guid JobId { get; set; }

    public string PhotoUrl { get; set; } = null!;

    public string PhotoType { get; set; } = null!;

    public DateTime UploadedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Job Job { get; set; } = null!;
}
