using ServicePilot.Application.DTOs.Jobs;
using ServicePilot.Domain.Entities;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Repositories
{
    public interface IJobRepository
    {
        Task<Job?> GetByIdAsync(Guid id, Guid companyId);
        Task<Job?> GetByIdWithDetailsAsync(Guid id, Guid companyId);

        Task<PagedResult<Job>> GetPagedAsync(
            Guid companyId, PagedJobRequest filter);

        // Dashboard helpers
        Task<IEnumerable<Job>> GetActiveJobsAsync(Guid companyId);
        Task<IEnumerable<Job>> GetByEmployeeAsync(Guid employeeId, Guid companyId);

        Task AddAsync(Job job);
        void Update(Job job);
        Task SaveChangesAsync();

        // Job status helpers
        Task<JobStatus?> GetStatusByIdAsync(Guid statusId, Guid companyId);
        Task<JobStatus?> GetDefaultStatusAsync(Guid companyId);  // first status by display_order

        // Photo helpers
        Task AddPhotoAsync(JobPhoto photo);
        Task<IEnumerable<JobPhoto>> GetPhotosAsync(Guid jobId);
        Task<JobPhoto?> GetPhotoByIdAsync(Guid photoId);
        void DeletePhoto(JobPhoto photo);

        // Status history
        Task AddStatusHistoryAsync(JobStatusHistory history);

        // Number generator
        Task<string> GenerateJobNumberAsync(Guid companyId);
    }
}
