using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Dashboard
{
    /// <summary>
    /// Personal dashboard for Technician (mobile app home screen).
    /// Everything the field worker needs in one call on app open.
    /// </summary>
    public class TechnicianDashboardDto
    {
        // ── Personal identity ──────────────────────────────────────────
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;

        // ── Today's attendance status ──────────────────────────────────
        public bool IsCheckedIn { get; set; }
        public bool IsCheckedOut { get; set; }
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string? AttendanceStatus { get; set; }  // Present | Late | null

        // ── Assigned jobs (active, not completed) ─────────────────────
        public List<TechnicianJobDto> MyJobs { get; set; } = new();

        // ── My pending requests ────────────────────────────────────────
        public int PendingLeaveRequests { get; set; }
        public int PendingOvertimeRequests { get; set; }

        // ── Document expiry warnings (own docs only) ──────────────────
        public List<ExpiryAlertDto> MyDocumentAlerts { get; set; } = new();

        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }

    public class TechnicianJobDto
    {
        public Guid Id { get; set; }
        public string JobNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string PriorityLabel { get; set; } = string.Empty;
        public string StatusName { get; set; } = string.Empty;
        public string? StatusColor { get; set; }
        public DateTime? ScheduledAt { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }
}
