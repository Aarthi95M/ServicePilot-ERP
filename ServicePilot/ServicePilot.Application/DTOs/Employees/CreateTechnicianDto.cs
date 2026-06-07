namespace ServicePilot.Application.DTOs.Employees
{
    /// <summary>
    /// Combined payload for Admin / HRManager to create a field-staff
    /// member (Technician or Supervisor) in a single call. Creates both
    /// an Employee record (for HR / attendance) and a linked User account
    /// (for mobile login) within a single database transaction.
    ///
    /// Only "Technician" and "Supervisor" are allowed here — these are the
    /// two roles that work in the field and need both an Employee profile
    /// AND mobile app access. Admin / HRManager / Dispatcher don't need an
    /// Employee profile, so they're created directly from User Management.
    /// </summary>
    public class CreateTechnicianDto
    {
        // ── Employee fields ───────────────────────────────────────────

        /// <summary>
        /// The role to assign to the new mobile login — must be either
        /// "Technician" or "Supervisor". Defaults to "Technician".
        /// </summary>
        public string Role { get; set; } = "Technician";

        /// <summary>Full name (required).</summary>
        public string FullName { get; set; } = string.Empty;

        /// <summary>Contact / HR email — may differ from login email.</summary>
        public string? Email { get; set; }

        public string? PhoneNumber { get; set; }

        public Guid? BranchId { get; set; }

        public Guid? DepartmentId { get; set; }

        public Guid? PositionId { get; set; }

        public DateOnly? JoiningDate { get; set; }

        public DateOnly? VisaExpiryDate { get; set; }

        public DateOnly? PassportExpiryDate { get; set; }

        public DateOnly? EmiratesIdExpiryDate { get; set; }

        public decimal? BasicSalary { get; set; }

        // ── User / login fields ───────────────────────────────────────

        /// <summary>
        /// Login email for the mobile app. If omitted, falls back to
        /// the employee <see cref="Email"/>. At least one must be supplied.
        /// </summary>
        public string? LoginEmail { get; set; }

        /// <summary>Initial password for the mobile app account.</summary>
        public string Password { get; set; } = string.Empty;
    }
}
