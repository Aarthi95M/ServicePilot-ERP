using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Reports
{
    /// <summary>
    /// Detailed attendance report for a date range.
    /// Used by HR Manager for payroll calculations.
    /// </summary>
    public class AttendanceReportDto
    {
        public DateOnly ReportFrom { get; set; }
        public DateOnly ReportTo { get; set; }
        public int TotalDays { get; set; }
        public List<AttendanceReportRowDto> Rows { get; set; } = new();
    }

    public class AttendanceReportRowDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }
        public string? BranchName { get; set; }

        public int PresentDays { get; set; }
        public int LateDays { get; set; }
        public int AbsentDays { get; set; }
        public double TotalHoursWorked { get; set; }
        public double AverageHoursPerDay { get; set; }
        public string? AverageCheckIn { get; set; }  // "HH:mm"
        public int OfflineSyncCount { get; set; }
    }
}
