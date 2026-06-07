namespace ServicePilot.Application.DTOs.Attendance
{
    /// <summary>
    /// Payload for Admin / Supervisor to manually create an attendance record
    /// for an employee who forgot to check in.
    /// </summary>
    public class CreateManualAttendanceDto
    {
        /// <summary>Employee to create the record for.</summary>
        public Guid EmployeeId { get; set; }

        /// <summary>Actual check-in time (UTC). Cannot be in the future.</summary>
        public DateTime CheckInTime { get; set; }

        /// <summary>
        /// Actual check-out time (UTC). Optional — leave null if the employee
        /// still needs to check out via the mobile app.
        /// </summary>
        public DateTime? CheckOutTime { get; set; }

        /// <summary>Reason / audit note for this manual entry.</summary>
        public string? Notes { get; set; }
    }
}
