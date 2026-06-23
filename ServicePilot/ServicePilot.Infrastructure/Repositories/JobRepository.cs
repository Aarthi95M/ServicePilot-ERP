using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic;
using ServicePilot.Application.DTOs.Jobs;
using ServicePilot.Application.Interfaces.Repositories;
using ServicePilot.Domain.Constants;
using ServicePilot.Domain.Entities;
using ServicePilot.Infrastructure.Persistence.Models;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Infrastructure.Repositories
{
    public class JobRepository : IJobRepository
    {

        private readonly AppDbContext _context;

        public JobRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(Job job)
        {
            await _context.Jobs.AddAsync(job);
        }

        public async Task AddPhotoAsync(JobPhoto photo)
        {
            await _context.JobPhotos.AddAsync(photo);
        }

        public async Task<JobPhoto?> GetPhotoByIdAsync(Guid photoId)
        {
            return await _context.JobPhotos.FirstOrDefaultAsync(p => p.Id == photoId);
        }

        public void DeletePhoto(JobPhoto photo)
        {
            _context.JobPhotos.Remove(photo);
        }

        public async Task AddStatusHistoryAsync(JobStatusHistory history)
        {
            await _context.JobStatusHistories.AddAsync(history);
        }

        /// <summary>
        /// Generates next sequential job number: JOB-2026-000001.
        /// Uses OrderByDescending on job_number string — works because
        /// the format is fixed-width zero-padded.
        /// Same race-condition caveat as EmployeeCode — DB unique index
        /// on (company_id, job_number) protects against duplicates.
        /// </summary>
        public async Task<string> GenerateJobNumberAsync(Guid companyId)
        {
            var year = DateTime.UtcNow.Year;
            var prefix = $"JOB-{year}-";

            var lastNumber = await _context.Jobs
                .Where(x =>
                    x.CompanyId == companyId &&
                    x.JobNumber != null &&
                    x.JobNumber.StartsWith(prefix))
                .OrderByDescending(x => x.JobNumber)
                .Select(x => x.JobNumber)
                .FirstOrDefaultAsync();

            int next = 1;
            if (!string.IsNullOrEmpty(lastNumber))
            {
                var parts = lastNumber.Split('-');
                if (parts.Length == 3 && int.TryParse(parts[2], out int num))
                    next = num + 1;
            }

            return $"{prefix}{next:D6}";
        }

        public async Task<IEnumerable<Job>> GetActiveJobsAsync(Guid companyId)
        {
            return await _context.Jobs
                .AsNoTracking()
                .Include(x => x.JobType)
                .Include(x => x.JobStatus)
                .Include(x => x.AssignedEmployee)
                .Where(x => x.CompanyId == companyId && x.CompletedAt == null)
                .OrderBy(x => x.Priority)
                .ThenBy(x => x.ScheduledAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Job>> GetByEmployeeAsync(Guid employeeId, Guid companyId)
        {
            return await _context.Jobs
                .AsNoTracking()
                .Include(x => x.JobType)
                .Include(x => x.JobStatus)
                //.Include(x => x.AssignedEmployee)
                .Where(x => x.CompanyId == companyId && x.CompletedAt == null && employeeId == x.AssignedEmployeeId)
                .OrderBy(x => x.Priority)
                .ThenBy(x => x.ScheduledAt)
                .ToListAsync();
        }

        public async Task<Job?> GetByIdAsync(Guid id, Guid companyId)
        {
            return await _context.Jobs
                .AsNoTracking()
                .Include(x => x.JobType)
                .Include(x => x.JobStatus)
                .Include(x => x.AssignedEmployee)
                .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId);
        }

        public async Task<Job?> GetByIdWithDetailsAsync(Guid id, Guid companyId)
        {
            return await _context.Jobs
             .AsNoTracking()
             .Include(x => x.JobStatus)
             .Include(x => x.JobType)
             .Include(x => x.AssignedEmployee)
             .Include(x => x.JobPhotos.OrderBy(p => p.UploadedAt))
             .Include(x => x.JobStatusHistories
                 .OrderByDescending(h => h.ChangedAt)
                 .Take(20))
                 .ThenInclude(h => h.OldStatus)
             .Include(x => x.JobStatusHistories)
                 .ThenInclude(h => h.NewStatus)
             .Include(x => x.JobStatusHistories)
                 .ThenInclude(h => h.ChangedByNavigation)
             .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId);
        }

        public async Task<JobStatus?> GetDefaultStatusAsync(Guid companyId)
        {
            return await _context.JobStatuses
                .AsNoTracking()
                .Where(x =>
                x.CompanyId == companyId && x.IsActive)
                .OrderBy(x => x.DisplayOrder)
                .FirstOrDefaultAsync();
        }

        public async Task<PagedResult<Job>> GetPagedAsync(Guid companyId, PagedJobRequest filter)
        {
            var query = _context.Jobs
              .AsNoTracking()
              .Include(x => x.JobStatus)
              .Include(x => x.JobType)
              .Include(x => x.AssignedEmployee)
              .Where(x => x.CompanyId == companyId);


            if(filter.AssignedEmployeeId.HasValue)
                query = query.Where(x => x.AssignedEmployeeId == filter.AssignedEmployeeId);

            if(filter.JobStatusId.HasValue)
                query = query.Where(x=>x.JobStatusId ==  filter.JobStatusId);

            if (filter.JobTypeId.HasValue)
                query = query.Where(x => x.JobTypeId == filter.JobTypeId);

            if (filter.Priority.HasValue)
            {
                var priorityLabel = JobPriority.GetLabel(filter.Priority.Value);
                query = query.Where(x => x.Priority == priorityLabel);
            }

            if (filter.IsCompleted.HasValue)
            {
                query = filter.IsCompleted.Value
                    ? query.Where(x => x.CompletedAt != null)
                    : query.Where(x => x.CompletedAt == null);
            }

            if (filter.ScheduledFrom.HasValue)
                query = query.Where(x => x.ScheduledAt >= filter.ScheduledFrom);

            if (filter.ScheduledTo.HasValue)
                query = query.Where(x => x.ScheduledAt <= filter.ScheduledTo);

            if (!string.IsNullOrWhiteSpace(filter.Search))
                query = query.Where(x =>
                    x.JobNumber.Contains(filter.Search) ||
                    x.CustomerName.Contains(filter.Search) ||
                    (x.CustomerPhone != null && x.CustomerPhone.Contains(filter.Search)));

            var totalCount = await query.CountAsync();

            query = (filter.SortBy?.ToLower(), filter.SortDir?.ToLower()) switch
            {
                ("scheduledat","desc") => query.OrderByDescending(x => x.ScheduledAt),
                ("scheduledat", _) => query.OrderBy(x => x.ScheduledAt),
                // Priority sort — DB stores string so we need explicit ordering
                ("priority", "asc") => query.OrderBy(x =>
                    x.Priority == JobPriority.CriticalLabel ? 1 :
                    x.Priority == JobPriority.HighLabel ? 2 :
                    x.Priority == JobPriority.MediumLabel ? 3 : 4),

                ("priority", "desc") => query.OrderByDescending(x =>
                    x.Priority == JobPriority.CriticalLabel ? 1 :
                    x.Priority == JobPriority.HighLabel ? 2 :
                    x.Priority == JobPriority.MediumLabel ? 3 : 4),
                ("createdat", "desc") => query.OrderByDescending(x => x.CreatedAt),
                ("createdat", _) => query.OrderBy(x => x.CreatedAt),
                ("customername", "desc") => query.OrderByDescending(x => x.CustomerName),
                ("customername", _) => query.OrderBy(x => x.CustomerName),
                _ => query.OrderBy(x => x.ScheduledAt)
            };


            var items = await query
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            return new PagedResult<Job> { Items = items 
            , Page = filter.Page, PageSize = filter.PageSize, TotalCount = totalCount};
        }

        public async Task<IEnumerable<JobPhoto>> GetPhotosAsync(Guid jobId)
        {
            return await _context.JobPhotos
                         .AsNoTracking()
                         .Where(x => x.JobId == jobId)
                         .OrderBy(x => x.UploadedAt)
                         .ToListAsync();
        }

        public async Task<JobStatus?> GetStatusByIdAsync(Guid statusId, Guid companyId)
        {
            return await _context.JobStatuses
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                x.CompanyId == companyId
                && x.Id == statusId
                && x.IsActive);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        public void Update(Job job)
        {
            _context.Jobs.Update(job);
        }
    }
}
