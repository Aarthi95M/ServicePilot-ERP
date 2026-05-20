using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Domain.Constants
{
    /// <summary>
    /// String constants for attendance status stored in DB.
    /// NEVER hardcode "Present", "Late", "Absent" as strings anywhere else.
    /// </summary>
    public static class AttendanceStatus
    {
        public const string Present = "Present";
        public const string Late = "Late";
        public const string Absent = "Absent";
    }
}
