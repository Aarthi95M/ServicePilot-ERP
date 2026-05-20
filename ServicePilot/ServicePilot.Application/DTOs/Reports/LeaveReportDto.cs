using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Reports
{
    /// <summary>
    /// Leave and overtime report for a given year.
    /// Used by HR Manager for payroll and HR analytics.
    /// </summary>
    public class LeaveReportDto
    {
        public int Year { get; set; }
        public List<LeaveReportRowDto> Rows { get; set; } = new();
    }

    public class LeaveReportRowDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }

        // Leave
        public int ApprovedLeaveDays { get; set; }
        public int PendingLeaveDays { get; set; }
        public int RejectedLeaveCount { get; set; }

        // Overtime
        public decimal ApprovedOvertimeHours { get; set; }
        public decimal PendingOvertimeHours { get; set; }
        public int RejectedOvertimeCount { get; set; }
    }
}
