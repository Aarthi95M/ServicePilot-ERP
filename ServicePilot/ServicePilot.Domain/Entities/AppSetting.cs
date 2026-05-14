using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class AppSetting
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public string SettingGroup { get; set; } = null!;

    public string SettingKey { get; set; } = null!;

    public string? SettingValue { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Company Company { get; set; } = null!;
}
