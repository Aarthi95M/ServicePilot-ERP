using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Dashboard
{
    /// <summary>
    /// Full company-wide dashboard for Admin role.
    /// Single API call returns everything needed for the main admin screen.
    /// </summary>
    public class AdminDashboardDto
    {
        // ── Header metrics ─────────────────────────────────────────────
        public int TotalActiveEmployees { get; set; }
        public int TotalActiveBranches { get; set; }
        public int TotalActiveJobs { get; set; }  // not completed
        public int PendingLeaveRequests { get; set; }
        public int PendingOvertimeRequests { get; set; }
        public int ExpiringDocumentsCount { get; set; }  // expiring within 30 days

        // ── Today's attendance ─────────────────────────────────────────
        public AttendanceSnapshotDto TodayAttendance { get; set; } = new();

        // ── Jobs by status ─────────────────────────────────────────────
        public List<JobStatusSummaryDto> JobsByStatus { get; set; } = new();

        // ── Pending approvals (top 10 most recent) ────────────────────
        public List<PendingRequestDto> PendingRequests { get; set; } = new();

        // ── Document expiry alerts (next 30 days) ─────────────────────
        public List<ExpiryAlertDto> ExpiryAlerts { get; set; } = new();

        // ── Currently active employees (on-site right now) ────────────
        public List<ActiveEmployeeDto> ActiveEmployees { get; set; } = new();

        // ── Upcoming jobs (next 7 days, not yet started) ──────────────
        public List<UpcomingJobDto> UpcomingJobs { get; set; } = new();

        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }
}
