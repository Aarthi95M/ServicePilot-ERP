using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Attendance
{
    /// <summary>
    /// Per-employee aggregated attendance summary for a date range.
    /// Used in monthly HR reports.
    /// </summary>
    public class AttendanceSummaryDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string? BranchName { get; set; }

        public int TotalDays { get; set; }
        public int PresentDays { get; set; }
        public int LateDays { get; set; }
        public int AbsentDays { get; set; }

        /// <summary>Sum of (CheckOutTime - CheckInTime) for all days with a checkout.</summary>
        public double TotalHoursWorked { get; set; }

        /// <summary>Average check-in time as "HH:mm". Null if no records in range.</summary>
        public string? AverageCheckIn { get; set; }
    }
}
