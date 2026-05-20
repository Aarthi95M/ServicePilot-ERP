using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Domain.Constants
{
    /// <summary>
    /// Status constants for both leave_requests and overtime_requests.
    /// Both tables use the same status workflow:
    /// Pending → Approved or Rejected
    /// Cancelled is set by the employee themselves before approval.
    /// </summary>
    public static class RequestStatus
    {
        public const string Pending = "Pending";
        public const string Approved = "Approved";
        public const string Rejected = "Rejected";
        public const string Cancelled = "Cancelled";

        public static bool IsValid(string status)
            => status is Pending or Approved or Rejected or Cancelled;

        public static bool IsTerminal(string status)
            => status is Approved or Rejected or Cancelled;
    }
}
