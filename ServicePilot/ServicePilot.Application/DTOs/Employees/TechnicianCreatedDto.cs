namespace ServicePilot.Application.DTOs.Employees
{
    /// <summary>
    /// Response returned after successfully creating a Technician
    /// (employee + linked user account in one atomic operation).
    /// </summary>
    public class TechnicianCreatedDto
    {
        // ── Employee info ─────────────────────────────────────────────
        public Guid   EmployeeId   { get; set; }
        public string EmployeeCode { get; set; } = string.Empty;
        public string FullName     { get; set; } = string.Empty;

        // ── User / login info ─────────────────────────────────────────
        public Guid   UserId    { get; set; }
        public string LoginEmail { get; set; } = string.Empty;
        public string Role       { get; set; } = "Technician";
    }
}
