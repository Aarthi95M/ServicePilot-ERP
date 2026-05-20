using ServicePilot.Application.DTOs.Attendance;
using ServicePilot.Domain.Entities;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Repositories
{
    public interface IAttendanceRepository
    {
        /// <summary>Today's open check-in for an employee (not yet checked out).</summary>
        Task<AttendanceLog?> GetOpenCheckInAsync(Guid employeeId, Guid companyId);

        /// <summary>All attendance records for today scoped to company.</summary>
        Task<IEnumerable<AttendanceLog>> GetTodayAsync(Guid companyId);

        Task<AttendanceLog?> GetByIdAsync(Guid id, Guid companyId);

        Task<PagedResult<AttendanceLog>> GetPagedAsync(
            Guid companyId, PagedAttendanceRequest filter);

        Task<IEnumerable<AttendanceSummaryDto>> GetSummaryAsync(
            Guid companyId, DateOnly from, DateOnly to,
            Guid? branchId, Guid? departmentId);

        Task AddAsync(AttendanceLog log);
        void Update(AttendanceLog log);
        Task SaveChangesAsync();
    }
}
