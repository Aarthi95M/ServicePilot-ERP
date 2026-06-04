namespace ServicePilot.Application.DTOs.Reports
{
    public class JobReportDto
    {
        public DateOnly ReportFrom { get; set; }
        public DateOnly ReportTo { get; set; }
        public int TotalJobs { get; set; }
        public int CompletedJobs { get; set; }
        public int ActiveJobs { get; set; }
        public double CompletionRate { get; set; }

        /// <summary>Per-technician aggregated summary rows.</summary>
        public List<JobReportRowDto> Rows { get; set; } = new();

        /// <summary>Individual job records for the detail table.</summary>
        public List<JobReportJobRow> Jobs { get; set; } = new();
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
        public double? AvgDurationHours { get; set; }
    }

    /// <summary>One row per job in the detail table.</summary>
    public class JobReportJobRow
    {
        public Guid Id { get; set; }
        public string JobNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string? JobTypeName { get; set; }
        public string? StatusName { get; set; }
        public string? StatusColor { get; set; }
        public string? AssignedEmployeeName { get; set; }
        public string? AssignedEmployeeCode { get; set; }
        public string PriorityLabel { get; set; } = string.Empty;
        public DateTime? ScheduledAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
