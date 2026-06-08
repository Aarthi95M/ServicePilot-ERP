using ServicePilot.Application.DTOs.Leave;
using ServicePilot.Domain.Entities;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Repositories
{
    public interface ILeaveRepository
    {
        Task<LeaveRequest?> GetByIdAsync(Guid id, Guid companyId);
        /// <summary>
        /// Paged leave list. Optional <paramref name="excludeEmployeeId"/> filters out
        /// a specific employee's own requests — used so a Supervisor's approval queue
        /// never contains their own leave requests (those must go to Admin/HR instead).
        /// Defaults to null (no exclusion) so existing callers are unaffected.
        /// </summary>
        Task<PagedResult<LeaveRequest>> GetPagedAsync(
            Guid companyId, PagedLeaveRequest filter, Guid? excludeEmployeeId = null);
        Task<IEnumerable<LeaveRequest>> GetByEmployeeAsync(Guid employeeId, Guid companyId);

        /// <summary>
        /// Checks for overlapping approved/pending leave for the same employee.
        /// Used to prevent duplicate leave requests for the same date range.
        /// </summary>
        Task<bool> HasOverlappingLeaveAsync(
            Guid employeeId, Guid companyId,
            DateOnly startDate, DateOnly endDate,
            Guid? excludeId = null);

        /// <summary>
        /// Total approved leave days taken for a specific employee and leave type in a year.
        /// Used to enforce max_days_per_year from leave_types.
        /// </summary>
        Task<int> GetApprovedDaysAsync(
            Guid employeeId, Guid leaveTypeId,
            int year);

        Task<LeaveType?> GetLeaveTypeAsync(Guid leaveTypeId, Guid companyId);

        Task<IEnumerable<LeaveSummaryDto>> GetSummaryAsync(
            Guid companyId, int year,
            Guid? employeeId, Guid? departmentId);

        Task AddAsync(LeaveRequest request);
        void Update(LeaveRequest request);
        Task SaveChangesAsync();
    }
}
