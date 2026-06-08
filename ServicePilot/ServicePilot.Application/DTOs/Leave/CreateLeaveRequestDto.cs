using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Leave
{
    public class CreateLeaveRequestDto
    {
        /// <summary>FK → leave_types. Must belong to same company.</summary>
        public Guid LeaveTypeId { get; set; }

        /// <summary>First day of leave (inclusive).</summary>
        public DateOnly StartDate { get; set; }

        /// <summary>Last day of leave (inclusive).</summary>
        public DateOnly EndDate { get; set; }

        /// <summary>Optional reason for leave.</summary>
        public string? Reason { get; set; }

        /// <summary>
        /// Optional — the employee this request is being filed FOR.
        /// Leave null for normal self-service requests (the calling user's own
        /// employee profile is used). Admin / Supervisor / HR Manager may set
        /// this to file a (possibly backdated) leave request on behalf of an
        /// employee who forgot to submit it themselves. Any other role supplying
        /// this is rejected by the service layer.
        /// </summary>
        public Guid? EmployeeId { get; set; }
    }
}
