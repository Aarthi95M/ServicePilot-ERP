using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Jobs
{
    public class AssignJobDto
    {
        /// <summary>Employee to assign. Null = unassign.</summary>
        public Guid? AssignedEmployeeId { get; set; }
    }
}
