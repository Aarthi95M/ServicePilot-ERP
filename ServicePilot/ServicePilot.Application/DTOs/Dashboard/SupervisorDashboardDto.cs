using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Dashboard
{
    /// <summary>
    /// Branch-scoped dashboard for Supervisor role.
    /// Same structure as Admin but filtered to the supervisor's branch.
    /// </summary>
    public class SupervisorDashboardDto
    {
        public string BranchName { get; set; } = string.Empty;

        // ── Header metrics ─────────────────────────────────────────────
        public int TotalBranchEmployees { get; set; }
        public int TotalActiveJobs { get; set; }
        public int TotalCompletedJobs { get; set; }
        public int PendingLeaveRequests { get; set; }
        public int PendingOvertimeRequests { get; set; }

        // ── Today's attendance ─────────────────────────────────────────
        public AttendanceSnapshotDto TodayAttendance { get; set; } = new();

        // ── Jobs by status ─────────────────────────────────────────────
        public List<JobStatusSummaryDto> JobsByStatus { get; set; } = new();

        // ── Pending approvals for branch employees ────────────────────
        public List<PendingRequestDto> PendingRequests { get; set; } = new();

        // ── Currently active employees ────────────────────────────────
        public List<ActiveEmployeeDto> ActiveEmployees { get; set; } = new();

        // ── Upcoming jobs assigned to branch employees ────────────────
        public List<UpcomingJobDto> UpcomingJobs { get; set; } = new();

        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }
}
