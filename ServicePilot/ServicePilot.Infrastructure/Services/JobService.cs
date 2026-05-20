using Microsoft.EntityFrameworkCore;
using ServicePilot.Application.DTOs.Jobs;
using ServicePilot.Application.Interfaces.Repositories;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;
using ServicePilot.Domain.Entities;
using ServicePilot.Infrastructure.Persistence.Models;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Infrastructure.Services
{
    public class JobService : IJobService
    {
        private readonly IJobRepository _repository;
        private readonly ICurrentUserService _currentUser;
        private readonly IAuthService _authorization;
        private readonly AppDbContext _context;

        public JobService(
            IJobRepository repository,
            ICurrentUserService currentUser,
            IAuthService authorization,
            AppDbContext context)
        {
            _repository = repository;
            _currentUser = currentUser;
            _authorization = authorization;
            _context = context;
        }

        public async Task<ApiResponse<JobResponseDto>> AssignAsync(Guid id, AssignJobDto dto)
        {
            if (!_authorization.IsAdmin() && !_authorization.IsSupervisor())
                return Fail<JobResponseDto>("Access denied.");

            var job = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (job == null)
                return Fail<JobResponseDto>("Job not found.");

            if (job.CompletedAt.HasValue)
                return Fail<JobResponseDto>("Cannot reassign a completed job.");

            // Validate new employee if assigning (not unassigning)
            if (dto.AssignedEmployeeId.HasValue)
            {
                var employeeExists = await _context.Employees.AnyAsync(x =>
                    x.Id == dto.AssignedEmployeeId &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

                if (!employeeExists)
                    return Fail<JobResponseDto>(
                        "Employee not found or inactive.");
            }

            job.AssignedEmployeeId = dto.AssignedEmployeeId;
            job.UpdatedAt = DateTime.UtcNow;

            _repository.Update(job);
            await _repository.SaveChangesAsync();

            var updated = await _repository.GetByIdAsync(job.Id, _currentUser.CompanyId);
            return Ok(MapToDto(updated!));
        }

        public async Task<ApiResponse<JobResponseDto>> CreateAsync(CreateJobDto dto)
        {
            // Only Admin and Supervisor can create jobs
            if (!_authorization.IsAdmin() && !_authorization.IsSupervisor())
                return Fail<JobResponseDto>("Access denied.");

            // Validate employee belongs to same company if provided
            if (dto.AssignedEmployeeId.HasValue)
            {
                var employeeExists = await _context.Employees.AnyAsync(x =>
                    x.Id == dto.AssignedEmployeeId &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

                if (!employeeExists)
                    return Fail<JobResponseDto>(
                        "Assigned employee not found or inactive.");
            }

            // Get default status (first by display_order)
            var defaultStatus = await _repository.GetDefaultStatusAsync(
                _currentUser.CompanyId);

            if (defaultStatus == null)
                return Fail<JobResponseDto>(
                    "No job statuses configured. Please set up job statuses first.");

            var jobNumber = await _repository.GenerateJobNumberAsync(
                _currentUser.CompanyId);

            var job = new Job
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.CompanyId,
                JobNumber = jobNumber,
                JobTypeId = dto.JobTypeId,
                JobStatusId = defaultStatus.Id,
                CustomerName = dto.CustomerName,
                CustomerPhone = dto.CustomerPhone,
                Address = dto.Address,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Priority = JobPriority.GetLabel(dto.Priority),
                ScheduledAt = dto.ScheduledAt,
                ScheduledEndAt = dto.ScheduledEndAt,
                AssignedEmployeeId = dto.AssignedEmployeeId,
                Notes = dto.Notes,
                CreatedBy = _currentUser.UserId,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddAsync(job);
            await _repository.SaveChangesAsync();

            // Reload with nav properties for response
            var created = await _repository.GetByIdAsync(job.Id, _currentUser.CompanyId);
            return Ok(MapToDto(created!));
        }

        public async Task<ApiResponse<bool>> DeleteAsync(Guid id)
        {
            if (!_authorization.IsAdmin())
                return Fail<bool>("Only administrators can delete jobs.");

            var job = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (job == null)
                return Fail<bool>("Job not found.");

            if (job.CompletedAt.HasValue)
                return Fail<bool>("Cannot delete a completed job.");

            // Hard delete — jobs can be deleted before completion
            // If you prefer soft delete, set a DeletedAt field instead
            _context.Jobs.Remove(job);
            await _repository.SaveChangesAsync();

            return Ok(true);
        }

        public async Task<ApiResponse<JobDetailDto>> GetByIdAsync(Guid id)
        {
            var job = await _repository.GetByIdWithDetailsAsync(id, _currentUser.CompanyId);

            if (job == null)
                return Fail<JobDetailDto>("Job not found.");

            // Supervisor: can only see jobs assigned to their branch employees
            if (_authorization.IsSupervisor())
            {
                var assignedToBranch = job.AssignedEmployeeId == null ||
                    await _context.Employees.AnyAsync(x =>
                        x.Id == job.AssignedEmployeeId &&
                        x.BranchId == _currentUser.BranchId);

                if (!assignedToBranch)
                    return Fail<JobDetailDto>("Access denied.");
            }

            return Ok(MapToDetailDto(job));
        }

        public async Task<ApiResponse<IEnumerable<JobResponseDto>>> GetMyJobsAsync()
        {
            // Resolve employee linked to current user
            var employee = await _context.Users
                .AsNoTracking()
                .Include(x => x.Employee)
                .Where(x =>
                    x.Id == _currentUser.UserId &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive)
                .Select(x => x.Employee)
                .FirstOrDefaultAsync();

            if (employee == null)
                return Fail<IEnumerable<JobResponseDto>>(
                    "No employee profile linked to this account.");

            var jobs = await _repository.GetByEmployeeAsync(
                employee.Id, _currentUser.CompanyId);

            return Ok(jobs.Select(MapToDto));
        }

        public async Task<ApiResponse<PagedResult<JobResponseDto>>> GetPagedAsync(PagedJobRequest filter)
        {
            // Supervisor: restrict to jobs assigned to employees in their branch
            // We do this by joining through employee branch — handled in repository
            // via AssignedEmployeeId filter set here if supervisor
            // For full branch isolation a more complex query is needed —
            // for now supervisor sees all company jobs (branch-level job filtering
            // is a Phase 5.1 enhancement)

            var result = await _repository.GetPagedAsync(_currentUser.CompanyId, filter);

            return Ok(new PagedResult<JobResponseDto>
            {
                Items = result.Items.Select(MapToDto).ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize
            });
        }

        public async Task<ApiResponse<JobResponseDto>> UpdateAsync(Guid id, UpdateJobDto dto)
        {
            if (!_authorization.IsAdmin() && !_authorization.IsSupervisor())
                return Fail<JobResponseDto>("Access denied.");

            var job = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (job == null)
                return Fail<JobResponseDto>("Job not found.");

            if (job.CompletedAt.HasValue)
                return Fail<JobResponseDto>(
                    "Cannot update a completed job.");

            job.JobTypeId = dto.JobTypeId;
            job.CustomerName = dto.CustomerName;
            job.CustomerPhone = dto.CustomerPhone;
            job.Address = dto.Address;
            job.Latitude = dto.Latitude;
            job.Longitude = dto.Longitude;
            job.Priority = JobPriority.GetLabel(dto.Priority);  // int → string
            job.ScheduledAt = dto.ScheduledAt;
            job.ScheduledEndAt = dto.ScheduledEndAt;
            job.Notes = dto.Notes;
            job.UpdatedAt = DateTime.UtcNow;

            _repository.Update(job);
            await _repository.SaveChangesAsync();

            var updated = await _repository.GetByIdAsync(job.Id, _currentUser.CompanyId);
            return Ok(MapToDto(updated!));
        }

        public async Task<ApiResponse<JobResponseDto>> UpdateStatusAsync(Guid id, UpdateJobStatusDto dto)
        {
            var job = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (job == null)
                return Fail<JobResponseDto>("Job not found.");

            // Employees can only update status of jobs assigned to them
            if (!_authorization.IsAdmin() && !_authorization.IsSupervisor())
            {
                var employee = await _context.Users
                    .AsNoTracking()
                    .Where(x =>
                        x.Id == _currentUser.UserId &&
                        x.CompanyId == _currentUser.CompanyId)
                    .Select(x => x.Employee)
                    .FirstOrDefaultAsync();

                if (employee == null || job.AssignedEmployeeId != employee.Id)
                    return Fail<JobResponseDto>(
                        "You can only update the status of jobs assigned to you.");
            }

            // Validate new status belongs to this company
            var newStatus = await _repository.GetStatusByIdAsync(
                dto.JobStatusId, _currentUser.CompanyId);

            if (newStatus == null)
                return Fail<JobResponseDto>("Invalid job status.");

            var oldStatusId = job.JobStatusId;

            job.JobStatusId = dto.JobStatusId;
            job.UpdatedAt = DateTime.UtcNow;

            // If moving to a "started" state — set StartedAt if not already set
            // Convention: status name contains "Progress" or "Started"
            if (job.StartedAt == null &&
                (newStatus.Name.Contains("Progress") || newStatus.Name.Contains("Started")))
            {
                job.StartedAt = DateTime.UtcNow;
            }

            // If moving to a "completed" state — set CompletedAt
            if (newStatus.Name.Contains("Complet") || newStatus.Name.Contains("Done"))
            {
                job.CompletedAt = DateTime.UtcNow;
            }

            _repository.Update(job);

            // Write status history record
            await _repository.AddStatusHistoryAsync(new JobStatusHistory
            {
                Id = Guid.NewGuid(),
                JobId = job.Id,
                OldStatusId = oldStatusId,
                NewStatusId = dto.JobStatusId,
                ChangedBy = _currentUser.UserId,
                ChangedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });

            await _repository.SaveChangesAsync();

            var updated = await _repository.GetByIdAsync(job.Id, _currentUser.CompanyId);
            return Ok(MapToDto(updated!));
        }

        public async Task<ApiResponse<JobPhotoDto>> UploadPhotoAsync(Guid id, UploadJobPhotoDto dto)
        {
            var job = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (job == null)
                return Fail<JobPhotoDto>("Job not found.");

            // Employees can only upload photos to jobs assigned to them
            if (!_authorization.IsAdmin() && !_authorization.IsSupervisor())
            {
                var employee = await _context.Users
                    .AsNoTracking()
                    .Where(x =>
                        x.Id == _currentUser.UserId &&
                        x.CompanyId == _currentUser.CompanyId)
                    .Select(x => x.Employee)
                    .FirstOrDefaultAsync();

                if (employee == null || job.AssignedEmployeeId != employee.Id)
                    return Fail<JobPhotoDto>(
                        "You can only upload photos for jobs assigned to you.");
            }

            var photo = new JobPhoto
            {
                Id = Guid.NewGuid(),
                JobId = job.Id,
                PhotoType = dto.PhotoType,
                PhotoUrl = dto.PhotoUrl,
                UploadedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddPhotoAsync(photo);
            await _repository.SaveChangesAsync();

            return Ok(new JobPhotoDto
            {
                Id = photo.Id,
                PhotoUrl = photo.PhotoUrl,
                PhotoType = photo.PhotoType,
                UploadedAt = photo.UploadedAt
            });
        }

        // ── Response wrappers — exact ApiResponse<T> shape ───────────────
        private static ApiResponse<T> Ok<T>(T data) => new()
        {
            Success = true,
            Data = data,
            Message = string.Empty,
            Errors = null
        };

        private static ApiResponse<T> Fail<T>(string message) => new()
        {
            Success = false,
            Data = default,
            Message = message,
            Errors = null
        };

        // ════════════════════════════════════════════════════════════════
        // MAPPING HELPERS
        // ════════════════════════════════════════════════════════════════

        private static JobResponseDto MapToDto(Job job)
        {
            return new JobResponseDto
            {
                Id = job.Id,
                JobNumber = job.JobNumber ?? string.Empty,
                JobTypeId = job.JobTypeId,
                JobTypeName = job.JobType?.Name,
                JobStatusId = job.JobStatusId,
                JobStatusName = job.JobStatus?.Name,
                StatusColor = job.JobStatus?.ColorCode,
                CustomerName = job.CustomerName ?? string.Empty,
                CustomerPhone = job.CustomerPhone,
                Address = job.Address,
                Latitude = job.Latitude,
                Longitude = job.Longitude,
                // Job.Priority is string, response DTO has both int and label
                Priority = JobPriority.GetValue(job.Priority ?? "Medium"),  // string → int
                PriorityLabel = job.Priority ?? "Medium",                         // string → string
                AssignedEmployeeId = job.AssignedEmployeeId,
                AssignedEmployeeName = job.AssignedEmployee?.FullName,
                AssignedEmployeeCode = job.AssignedEmployee?.EmployeeCode,
                ScheduledAt = job.ScheduledAt,
                ScheduledEndAt = job.ScheduledEndAt,
                StartedAt = job.StartedAt,
                CompletedAt = job.CompletedAt,
                Notes = job.Notes,
                CreatedAt = job.CreatedAt
            };
        }

        private static JobDetailDto MapToDetailDto(Job job)
        {
            var dto = new JobDetailDto
            {
                Id = job.Id,
                JobNumber = job.JobNumber ?? string.Empty,
                JobTypeId = job.JobTypeId,
                JobTypeName = job.JobType?.Name,
                JobStatusId = job.JobStatusId,
                JobStatusName = job.JobStatus?.Name,
                StatusColor = job.JobStatus?.ColorCode,
                CustomerName = job.CustomerName ?? string.Empty,
                CustomerPhone = job.CustomerPhone,
                Address = job.Address,
                Latitude = job.Latitude,
                Longitude = job.Longitude,
                // Job.Priority is string, response DTO has both int and label
                Priority = JobPriority.GetValue(job.Priority ?? "Medium"),  // string → int
                PriorityLabel = job.Priority ?? "Medium",                         // string → string
                AssignedEmployeeId = job.AssignedEmployeeId,
                AssignedEmployeeName = job.AssignedEmployee?.FullName,
                AssignedEmployeeCode = job.AssignedEmployee?.EmployeeCode,
                ScheduledAt = job.ScheduledAt,
                ScheduledEndAt = job.ScheduledEndAt,
                StartedAt = job.StartedAt,
                CompletedAt = job.CompletedAt,
                Notes = job.Notes,
                CreatedAt = job.CreatedAt,

                StatusHistory = job.JobStatusHistories?
                    .OrderByDescending(h => h.ChangedAt)
                    .Select(h => new JobStatusHistoryDto
                    {
                        Id = h.Id,
                        OldStatusName = h.OldStatus?.Name,
                        NewStatusName = h.NewStatus?.Name ?? string.Empty,
                        ChangedByName = h.ChangedByNavigation?.FullName,
                        ChangedAt = h.ChangedAt
                    }).ToList() ?? new(),

                Photos = job.JobPhotos?
                    .OrderBy(p => p.UploadedAt)
                    .Select(p => new JobPhotoDto
                    {
                        Id = p.Id,
                        PhotoUrl = p.PhotoUrl ?? string.Empty,
                        PhotoType = p.PhotoType ?? string.Empty,
                        UploadedAt = p.UploadedAt
                    }).ToList() ?? new()
            };

            return dto;
        }
    }
}
