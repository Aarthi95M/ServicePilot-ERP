using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Companies
{
    /// <summary>
    /// Represents a single app_settings row.
    /// Used to get/set company-specific configuration like
    /// shift start time and grace period.
    /// </summary>
    public class CompanySettingDto
    {
        public string SettingGroup { get; set; } = string.Empty;
        public string SettingKey { get; set; } = string.Empty;
        public string? SettingValue { get; set; }
    }

    /// <summary>
    /// Strongly-typed company settings — the most common ones.
    /// Avoids the frontend having to know magic key strings.
    /// </summary>
    public class CompanyConfigDto
    {
        /// <summary>Shift start time in HH:mm (UTC). e.g. "08:00"</summary>
        public string ShiftStartTime { get; set; } = "08:00";

        /// <summary>Grace period end in HH:mm (UTC). e.g. "08:15"</summary>
        public string GracePeriodEnd { get; set; } = "08:15";

        /// <summary>Company timezone. e.g. "Asia/Dubai"</summary>
        public string Timezone { get; set; } = "Asia/Dubai";

        /// <summary>Working days: comma-separated. e.g. "Mon,Tue,Wed,Thu,Fri"</summary>
        public string WorkingDays { get; set; } = "Mon,Tue,Wed,Thu,Fri";

        /// <summary>Max overtime hours per day allowed.</summary>
        public int MaxOvertimeHours { get; set; } = 4;
    }
}
