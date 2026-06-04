namespace ServicePilot.Application.DTOs.Attendance
{
    /// <summary>
    /// Payload for a supervisor / admin manual attendance adjustment.
    /// Allows correcting check-in time, check-out time, or clearing a
    /// check-out so the employee can check out again via the mobile app.
    /// </summary>
    public class AdjustAttendanceRequestDto
    {
        /// <summary>
        /// Corrected check-in time (UTC).
        /// Re-computes Present / Late status automatically.
        /// </summary>
        public DateTime CheckInTime { get; set; }

        /// <summary>
        /// Corrected check-out time (UTC).
        /// Pass null to clear an existing check-out — the employee can
        /// then check out again normally from the mobile app.
        /// </summary>
        public DateTime? CheckOutTime { get; set; }

        /// <summary>Optional reason for audit log / display.</summary>
        public string? Notes { get; set; }
    }
}
