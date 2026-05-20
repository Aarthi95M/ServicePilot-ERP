using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Reports
{
    /// <summary>
    /// Job completion report for a date range.
    /// Shows completion rates, average duration, and technician performance.
    /// </summary>
    public class JobReportDto
    {
        public DateOnly ReportFrom { get; set; }
        public DateOnly ReportTo { get; set; }
        public int TotalJobs { get; set; }
        public int CompletedJobs { get; set; }
        public int ActiveJobs { get; set; }
        public double CompletionRate { get; set; }  // percentage
        public List<JobReportRowDto> Rows { get; set; } = new();
    }

    public class JobReportRowDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public int TotalAssigned { get; set; }
        public int Completed { get; set; }
        public int InProgress { get; set; }
        public double CompletionRate { get; set; }
        public double? AvgDurationHours { get; set; } // avg (CompletedAt - StartedAt)
    }
}
