// ============================================================
// FILE: ServicePilot.Domain/Constants/Roles.cs
// ============================================================
// IMPORTANT: These strings must exactly match the Name column
// in the roles table and what is stored in JWT ClaimTypes.Role.
// Never hardcode role strings in controllers — always use these.
// ============================================================
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Domain.Constants
{
    public static class Roles
    {
        public const string Admin = "Admin";
        public const string Supervisor = "Supervisor";
        public const string HRManager = "HRManager";
        public const string Dispatcher = "Dispatcher";
        public const string Technician = "Technician";   // ← was Employee

        // ── Convenience groupings for [Authorize(Roles=...)] ──────────
        // Use these in controllers so you never miss a role.

        /// <summary>All roles that can manage employee profiles and HR data.</summary>
        public const string HRAccess = "Admin,HRManager";

        /// <summary>All roles that can view employees (read-only for Dispatcher/Supervisor).</summary>
        public const string EmployeeReadAccess = "Admin,HRManager,Supervisor,Dispatcher";

        /// <summary>All roles that can create and update jobs.</summary>
        public const string JobWriteAccess = "Admin,Supervisor,Dispatcher";

        /// <summary>All roles that can view jobs.</summary>
        public const string JobReadAccess = "Admin,Supervisor,Dispatcher,Technician";

        /// <summary>All roles that can view attendance data (not just their own).</summary>
        public const string AttendanceReadAccess = "Admin,HRManager,Supervisor";

        /// <summary>All roles that can check in/out (field roles).</summary>
        public const string CheckInAccess = "Admin,Supervisor,Technician";

        /// <summary>
        /// All roles that can submit leave requests — either for themselves
        /// (Technician/Supervisor/Admin self-service) or, for Admin/Supervisor/
        /// HRManager, on behalf of another employee (e.g. backdated leave the
        /// employee forgot to file). HRManager is included here (but NOT in
        /// CheckInAccess) specifically so HR can file leave for employees.
        /// </summary>
        public const string LeaveWriteAccess = "Admin,Supervisor,Technician,HRManager";

        /// <summary>Lookup endpoints — all authenticated roles.</summary>
        public const string AllRoles = "Admin,HRManager,Supervisor,Dispatcher,Technician";
    }
}
