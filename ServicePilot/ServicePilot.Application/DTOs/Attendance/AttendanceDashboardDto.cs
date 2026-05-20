using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Attendance
{
    /// <summary>
    /// Today's attendance overview returned to admin/supervisor dashboards.
    /// </summary>
    public class AttendanceDashboardDto
    {
        public DateOnly Date { get; set; }
        public int TotalEmployees { get; set; }
        public int CheckedIn { get; set; }
        public int CheckedOut { get; set; }
        public int Late { get; set; }

        /// <summary>TotalEmployees - CheckedIn. Derived, never stored.</summary>
        public int Absent { get; set; }

        /// <summary>How many of today's records came from offline sync.</summary>
        public int OfflineSynced { get; set; }

        /// <summary>Employees currently on-site (checked in, not yet checked out).</summary>
        public List<AttendanceResponseDto> ActiveEmployees { get; set; } = new();
    }
}
