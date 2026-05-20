using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Domain.Constants
{
    /// <summary>
    /// Integer priority constants for jobs.
    /// Stored as int in DB — lower number = higher priority.
    /// Use these constants everywhere — never hardcode magic numbers.
    /// </summary>
    public static class JobPriority
    {
        // ── Int constants (used in DTOs for API input) ────────────
        public const int Critical = 1;
        public const int High = 2;
        public const int Medium = 3;
        public const int Low = 4;

        // ── String constants (used in DB / entity) ────────────────
        public const string CriticalLabel = "Critical";
        public const string HighLabel = "High";
        public const string MediumLabel = "Medium";
        public const string LowLabel = "Low";

        public static string GetLabel(int priority) => priority switch
        {
            Critical => CriticalLabel,
            High => HighLabel,
            Medium => MediumLabel,
            Low => LowLabel,
            _ => MediumLabel   // safe fallback
        };

        public static int GetValue(string label) => label?.ToLower() switch
        {
            "critical" => Critical,
            "high" => High,
            "medium" => Medium,
            "low" => Low,
            _ => Medium      // safe fallback
        };

        public static bool IsValid(int priority)
            => priority >= Critical && priority <= Low;

        public static bool IsValidLabel(string label)
            => new[] { CriticalLabel, HighLabel, MediumLabel, LowLabel }
                .Contains(label, StringComparer.OrdinalIgnoreCase);
    }
}
