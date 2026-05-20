using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Dashboard
{
    /// <summary>Attendance snapshot for a single day.</summary>
    public class AttendanceSnapshotDto
    {
        public DateOnly Date { get; set; }
        public int TotalEmployees { get; set; }
        public int CheckedIn { get; set; }
        public int Late { get; set; }
        public int Absent { get; set; }  // TotalEmployees - CheckedIn
        public int CheckedOut { get; set; }
        public int OfflineSynced { get; set; }
    }

    /// <summary>Job counts grouped by status for the kanban/summary view.</summary>
    public class JobStatusSummaryDto
    {
        public Guid StatusId { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public string ColorCode { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    /// <summary>Single pending request item for approval queue.</summary>
    public class PendingRequestDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty; // "Leave" | "Overtime"
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty; // e.g. "Annual Leave: 5 days"
        public DateTime SubmittedAt { get; set; }
    }

    /// <summary>Document expiry alert.</summary>
    public class ExpiryAlertDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string DocumentType { get; set; } = string.Empty; // "Visa" | "Passport" | "EmiratesId"
        public DateOnly ExpiryDate { get; set; }
        public int DaysLeft { get; set; }  // negative = already expired
    }

    /// <summary>Currently active (checked-in, not yet out) employee.</summary>
    public class ActiveEmployeeDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public DateTime CheckInTime { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }

    /// <summary>Upcoming scheduled job for the next 7 days.</summary>
    public class UpcomingJobDto
    {
        public Guid Id { get; set; }
        public string JobNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string PriorityLabel { get; set; } = string.Empty;
        public string? AssignedEmployeeName { get; set; }
        public DateTime ScheduledAt { get; set; }
    }
}
