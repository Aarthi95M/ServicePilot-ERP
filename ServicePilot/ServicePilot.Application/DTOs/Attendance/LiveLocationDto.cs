namespace ServicePilot.Application.DTOs.Attendance;

public class LiveLocationDto
{
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = null!;
    public string? EmployeeCode { get; set; }
    public string? PhoneNumber { get; set; }
    public string? BranchName { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime? LastSeenAt { get; set; }
    /// <summary>"CheckedIn" | "CheckedOut" | "NotCheckedIn"</summary>
    public string AttendanceStatus { get; set; } = "NotCheckedIn";
}
