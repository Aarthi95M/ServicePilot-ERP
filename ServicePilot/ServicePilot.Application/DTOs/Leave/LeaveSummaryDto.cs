using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Leave
{
    /// <summary>
    /// Per-employee leave summary for a given year.
    /// Used by HR Manager and Admin for leave balance reporting.
    /// </summary>
    public class LeaveSummaryDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;

        public List<LeaveTypeBalance> Balances { get; set; } = new();
    }

    public class LeaveTypeBalance
    {
        public string LeaveTypeName { get; set; } = string.Empty;
        public bool IsPaid { get; set; }
        public int MaxDaysPerYear { get; set; }
        public int DaysTaken { get; set; }   // approved leaves only
        public int DaysPending { get; set; }   // pending leaves
        public int DaysRemaining { get; set; }   // MaxDaysPerYear - DaysTaken
    }
}
