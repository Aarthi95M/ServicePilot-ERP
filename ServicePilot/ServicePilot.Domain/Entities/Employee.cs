using System;
using System.Collections.Generic;

namespace ServicePilot.Domain.Entities;

public partial class Employee
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Guid? BranchId { get; set; }

    public Guid? PositionId { get; set; }

    public Guid? DepartmentId { get; set; }

    public string? EmployeeCode { get; set; }

    public string FullName { get; set; } = null!;

    public string? PhoneNumber { get; set; }

    public string? Email { get; set; }

    public DateOnly? VisaExpiryDate { get; set; }

    public DateOnly? PassportExpiryDate { get; set; }

    public DateOnly? EmiratesIdExpiryDate { get; set; }

    public DateOnly? JoiningDate { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<AttendanceLog> AttendanceLogs { get; set; } = new List<AttendanceLog>();

    public virtual Branch? Branch { get; set; }

    public virtual Company Company { get; set; } = null!;

    public virtual Department? Department { get; set; }

    public virtual ICollection<EmployeeShift> EmployeeShifts { get; set; } = new List<EmployeeShift>();

    public virtual ICollection<GpsLog> GpsLogs { get; set; } = new List<GpsLog>();

    public virtual ICollection<Job> Jobs { get; set; } = new List<Job>();

    public virtual ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();

    public virtual ICollection<OvertimeRequest> OvertimeRequests { get; set; } = new List<OvertimeRequest>();

    public virtual Position? Position { get; set; }

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
