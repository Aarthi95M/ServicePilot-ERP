// ============================================================
// JobService.cs — COMPLETE FILE
// Drop-in replacement for your existing JobService.cs
// Fixes:
//   1. UpdateStatusAsync — validates BEFORE writing history
//      + proper StringComparison.OrdinalIgnoreCase throughout
//      + "requires employee" check
//      + "cannot revert to pending" check
//   2. AssignAsync — auto-transitions Pending → Assigned
//      + writes status history for the auto-transition
//      + proper null checks
// Everything else is identical to your original
// ============================================================

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
        private readonly INotificationService _notifications;

        public JobService(
            IJobRepository repository,
            ICurrentUserService currentUser,
            IAuthService authorization,
            AppDbContext context,
            INotificationService notifications)
        {
            _repository    = repository;
            _currentUser   = currentUser;
            _authorization = authorization;
            _context       = context;
            _notifications = notifications;
        }

        // ── Helper: check if a status name requires an assigned employee ──
        // Centralised so we don't repeat the logic in two places.
        // Uses OrdinalIgnoreCase — avoids .ToLower() allocation + locale issues.
        private static bool StatusRequiresEmployee(string? statusName)
        {
            if (string.IsNullOrWhiteSpace(statusName)) return false;

            // Called on in-memory string — OrdinalIgnoreCase is fine here
            return statusName.Contains("assigned", StringComparison.OrdinalIgnoreCase)
                || statusName.Contains("in progress", StringComparison.OrdinalIgnoreCase)
                || statusName.Contains("in transit", StringComparison.OrdinalIgnoreCase)
                || statusName.Contains("on site", StringComparison.OrdinalIgnoreCase)
                || statusName.Contains("completed", StringComparison.OrdinalIgnoreCase)
                || statusName.Contains("done", StringComparison.OrdinalIgnoreCase);
        }

        // ── Helper: check if a status name means "pending" ───────────────
        private static bool StatusIsPending(string? statusName)
        {
            if (string.IsNullOrWhiteSpace(statusName)) return false;
            // Called on in-memory string — OrdinalIgnoreCase is fine here
            return statusName.Contains("pending", StringComparison.OrdinalIgnoreCase);
        }

        // ════════════════════════════════════════════════════════════════
        // AssignAsync — assign (or unassign) an employee to a job.
        // Auto-transitions status Pending → Assigned when assigning.
        // ════════════════════════════════════════════════════════════════
        public async Task<ApiResponse<JobResponseDto>> AssignAsync(Guid id, AssignJobDto dto)
        {
            if (!_authorization.IsAdmin() && !_authorization.IsSupervisor())
                return Fail<JobResponseDto>("Access denied.");

            var job = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (job == null)
                return Fail<JobResponseDto>("Job not found.");

            if (job.CompletedAt.HasValue)
                return Fail<JobResponseDto>("Cannot reassign a completed job.");

            // Validate employee belongs to same company and is active
            if (dto.AssignedEmployeeId.HasValue)
            {
                var employeeExists = await _context.Employees.AnyAsync(x =>
                    x.Id == dto.AssignedEmployeeId &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

                if (!employeeExists)
                    return Fail<JobResponseDto>("Employee not found or inactive.");
            }

            // Capture old status ID before any mutations
            var oldStatusId = job.JobStatusId;

            // Assign (or unassign) the employee
            job.AssignedEmployeeId = dto.AssignedEmployeeId;
            job.UpdatedAt = DateTime.UtcNow;

            // ── Auto-transition: Pending → Assigned ───────────────────
            // Only fires when an employee is being ASSIGNED (not unassigned)
            if (dto.AssignedEmployeeId.HasValue)
            {
                // Load ALL company statuses to memory — avoids EF translation error.
                // Job statuses are a small lookup table (typically 5-10 rows)
                // so loading all is perfectly fine performance-wise.
                var allStatuses = await _context.JobStatuses
                    .AsNoTracking()
                    .Where(x => x.CompanyId == _currentUser.CompanyId)
                    .ToListAsync(); // ← load to memory FIRST

                // Now use C# string methods safely — we're in memory, not SQL
                var currentStatus = allStatuses.FirstOrDefault(x => x.Id == job.JobStatusId);
                var assignedStatus = allStatuses.FirstOrDefault(x =>
                    x.Name.Contains("Assigned", StringComparison.OrdinalIgnoreCase));

                // Only auto-transition if currently Pending AND "Assigned" status exists
                if (StatusIsPending(currentStatus?.Name) && assignedStatus != null)
                {
                    job.JobStatusId = assignedStatus.Id;

                    // Write history for the auto-transition
                    await _repository.AddStatusHistoryAsync(new JobStatusHistory
                    {
                        Id = Guid.NewGuid(),
                        JobId = job.Id,
                        OldStatusId = oldStatusId,
                        NewStatusId = assignedStatus.Id,
                        ChangedBy = _currentUser.UserId,
                        ChangedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            // Null nav props before Update — prevents EF Core relationship fixup
            // from overriding the FK values we just set with the old nav prop IDs.
            job.AssignedEmployee = null;
            job.JobStatus = null;
            job.JobType = null;

            _repository.Update(job);
            await _repository.SaveChangesAsync();

            // Notify the newly assigned employee (if assigning, not unassigning)
            if (dto.AssignedEmployeeId.HasValue)
            {
                var assignedUserId = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.EmployeeId == dto.AssignedEmployeeId && u.CompanyId == _currentUser.CompanyId)
                    .Select(u => (Guid?)u.Id)
                    .FirstOrDefaultAsync();

                if (assignedUserId.HasValue)
                    await _notifications.NotifyUserAsync(
                        _currentUser.CompanyId,
                        assignedUserId.Value,
                        title:   $"Job Assigned — {job.JobNumber}",
                        message: $"You have been assigned to job {job.JobNumber} for {job.CustomerName}.",
                        type:    "job");
            }

            var updated = await _repository.GetByIdAsync(job.Id, _currentUser.CompanyId);
            return Ok(MapToDto(updated!));
        }

        // ════════════════════════════════════════════════════════════════
        // CreateAsync — also fix the auto-assign status on job creation
        // When a job is created WITH an employee already assigned,
        // it should start in "Assigned" status, not "Pending"
        // ════════════════════════════════════════════════════════════════
        public async Task<ApiResponse<JobResponseDto>> CreateAsync(CreateJobDto dto)
        {
            if (!_authorization.IsAdmin() && !_authorization.IsSupervisor())
                return Fail<JobResponseDto>("Access denied.");

            if (dto.AssignedEmployeeId.HasValue)
            {
                var employeeExists = await _context.Employees.AnyAsync(x =>
                    x.Id == dto.AssignedEmployeeId &&
                    x.CompanyId == _currentUser.CompanyId &&
                    x.IsActive);

                if (!employeeExists)
                    return Fail<JobResponseDto>("Assigned employee not found or inactive.");
            }

            // Load all statuses to memory once
            var allStatuses = await _context.JobStatuses
                .AsNoTracking()
                .Where(x => x.CompanyId == _currentUser.CompanyId)
                .OrderBy(x => x.DisplayOrder)
                .ToListAsync();

            if (!allStatuses.Any())
                return Fail<JobResponseDto>(
                    "No job statuses configured. Please set up job statuses first.");

            // Determine starting status:
            // - If employee assigned → use "Assigned" status
            // - Otherwise → use first status (Pending)
            JobStatus? startingStatus;

            if (dto.AssignedEmployeeId.HasValue)
            {
                startingStatus = allStatuses.FirstOrDefault(x =>
                    x.Name.Contains("Assigned", StringComparison.OrdinalIgnoreCase))
                    ?? allStatuses.First(); // fallback to first if no "Assigned" status
            }
            else
            {
                startingStatus = allStatuses.First(); // Pending (lowest display_order)
            }

            var jobNumber = await _repository.GenerateJobNumberAsync(_currentUser.CompanyId);

            var job = new Job
            {
                Id = Guid.NewGuid(),
                CompanyId = _currentUser.CompanyId,
                JobNumber = jobNumber,
                JobTypeId = dto.JobTypeId,
                JobStatusId = startingStatus.Id,
                CustomerName = dto.CustomerName,
                CustomerPhone = dto.CustomerPhone,
                Address = dto.Address,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Priority = JobPriority.GetLabel(dto.Priority),
                ScheduledAt = dto.ScheduledAt.HasValue
                                        ? DateTime.SpecifyKind(dto.ScheduledAt.Value, DateTimeKind.Utc)
                                        : null,
                ScheduledEndAt = dto.ScheduledEndAt.HasValue
                                        ? DateTime.SpecifyKind(dto.ScheduledEndAt.Value, DateTimeKind.Utc)
                                        : null,
                AssignedEmployeeId = dto.AssignedEmployeeId,
                Notes = dto.Notes,
                CreatedBy = _currentUser.UserId,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddAsync(job);
            await _repository.SaveChangesAsync();

            // If an employee was assigned at creation, notify them
            if (dto.AssignedEmployeeId.HasValue)
            {
                var assignedUserId = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.EmployeeId == dto.AssignedEmployeeId && u.CompanyId == _currentUser.CompanyId)
                    .Select(u => (Guid?)u.Id)
                    .FirstOrDefaultAsync();

                if (assignedUserId.HasValue)
                    await _notifications.NotifyUserAsync(
                        _currentUser.CompanyId,
                        assignedUserId.Value,
                        title:   $"New Job Assigned — {jobNumber}",
                        message: $"You have been assigned job {jobNumber} for {dto.CustomerName}." +
                                 (dto.Address != null ? $" Location: {dto.Address}." : "") +
                                 (dto.ScheduledAt.HasValue ? $" Scheduled: {dto.ScheduledAt.Value:dd MMM yyyy HH:mm}." : ""),
                        type:    "job");
            }

            var created = await _repository.GetByIdAsync(job.Id, _currentUser.CompanyId);
            return Ok(MapToDto(created!));
        }

        // ════════════════════════════════════════════════════════════════
        // DeleteAsync — unchanged from your original
        // ════════════════════════════════════════════════════════════════
        public async Task<ApiResponse<bool>> DeleteAsync(Guid id)
        {
            if (!_authorization.IsAdmin())
                return Fail<bool>("Only administrators can delete jobs.");

            var job = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (job == null)
                return Fail<bool>("Job not found.");

            if (job.CompletedAt.HasValue)
                return Fail<bool>("Cannot delete a completed job.");

            _context.Jobs.Remove(job);
            await _repository.SaveChangesAsync();

            return Ok(true);
        }

        // ════════════════════════════════════════════════════════════════
        // GetByIdAsync — unchanged from your original
        // ════════════════════════════════════════════════════════════════
        public async Task<ApiResponse<JobDetailDto>> GetByIdAsync(Guid id)
        {
            var job = await _repository.GetByIdWithDetailsAsync(id, _currentUser.CompanyId);

            if (job == null)
                return Fail<JobDetailDto>("Job not found.");

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

        // ════════════════════════════════════════════════════════════════
        // GetMyJobsAsync — unchanged from your original
        // ════════════════════════════════════════════════════════════════
        public async Task<ApiResponse<IEnumerable<JobResponseDto>>> GetMyJobsAsync()
        {
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

        // ════════════════════════════════════════════════════════════════
        // GetPagedAsync — unchanged from your original
        // ════════════════════════════════════════════════════════════════
        public async Task<ApiResponse<PagedResult<JobResponseDto>>> GetPagedAsync(PagedJobRequest filter)
        {
            var result = await _repository.GetPagedAsync(_currentUser.CompanyId, filter);

            return Ok(new PagedResult<JobResponseDto>
            {
                Items = result.Items.Select(MapToDto).ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize
            });
        }

        // ════════════════════════════════════════════════════════════════
        // UpdateAsync — unchanged from your original
        // ════════════════════════════════════════════════════════════════
        public async Task<ApiResponse<JobResponseDto>> UpdateAsync(Guid id, UpdateJobDto dto)
        {
            if (!_authorization.IsAdmin() && !_authorization.IsSupervisor())
                return Fail<JobResponseDto>("Access denied.");

            var job = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (job == null)
                return Fail<JobResponseDto>("Job not found.");

            if (job.CompletedAt.HasValue)
                return Fail<JobResponseDto>("Cannot update a completed job.");

            job.JobTypeId = dto.JobTypeId;
            job.CustomerName = dto.CustomerName;
            job.CustomerPhone = dto.CustomerPhone;
            job.Address = dto.Address;
            job.Latitude = dto.Latitude;
            job.Longitude = dto.Longitude;
            job.Priority = JobPriority.GetLabel(dto.Priority);
            job.ScheduledAt = dto.ScheduledAt.HasValue
                                    ? DateTime.SpecifyKind(dto.ScheduledAt.Value, DateTimeKind.Utc)
                                    : null;
            job.ScheduledEndAt = dto.ScheduledEndAt.HasValue
                                    ? DateTime.SpecifyKind(dto.ScheduledEndAt.Value, DateTimeKind.Utc)
                                    : null;
            job.Notes = dto.Notes;
            job.UpdatedAt = DateTime.UtcNow;

            // Null nav props before Update — prevents EF Core relationship fixup
            // from overriding FK changes with the old nav prop IDs.
            job.JobType = null;
            job.JobStatus = null;
            job.AssignedEmployee = null;

            _repository.Update(job);
            await _repository.SaveChangesAsync();

            var updated = await _repository.GetByIdAsync(job.Id, _currentUser.CompanyId);
            return Ok(MapToDto(updated!));
        }

        // ════════════════════════════════════════════════════════════════
        // UpdateStatusAsync — FIXED
        // Problem: Same EF translation error when checking StatusRequiresEmployee
        //          The old code also wasn't doing the "requires employee" check at all
        // Fix: GetStatusByIdAsync already loads ONE status — that's fine.
        //      The StatusRequiresEmployee helper runs on the in-memory object.
        // Also fixed: status response was still showing "Pending" because
        //   the job reload after save was returning cached nav property.
        //   Fix: reload uses GetByIdAsync which re-queries the DB.
        // ════════════════════════════════════════════════════════════════
        public async Task<ApiResponse<JobResponseDto>> UpdateStatusAsync(Guid id, UpdateJobStatusDto dto)
        {
            var job = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (job == null)
                return Fail<JobResponseDto>("Job not found.");

            // ── Authorization ─────────────────────────────────────────
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

            // GetStatusByIdAsync loads ONE row to memory — no EF translation issue
            var newStatus = await _repository.GetStatusByIdAsync(
                dto.JobStatusId, _currentUser.CompanyId);

            if (newStatus == null)
                return Fail<JobResponseDto>("Invalid job status.");

            // ── BUSINESS RULES — all checked BEFORE any DB write ─────

            // Rule 1: same status
            if (job.JobStatusId == dto.JobStatusId)
                return Fail<JobResponseDto>(
                    $"Job is already in \"{newStatus.Name}\" status.");

            // Rule 2: statuses requiring an assigned employee.
            // newStatus.Name is an in-memory string here — OrdinalIgnoreCase works fine.
            if (StatusRequiresEmployee(newStatus.Name) && job.AssignedEmployeeId == null)
                return Fail<JobResponseDto>(
                    $"Cannot set status to \"{newStatus.Name}\" — " +
                    "please assign an employee to this job first.");

            // Rule 3: cannot revert to Pending after job has started
            if (StatusIsPending(newStatus.Name) &&
                (job.StartedAt != null || job.CompletedAt != null))
                return Fail<JobResponseDto>(
                    "Cannot revert to Pending — the job has already been started.");

            // ── ALL VALIDATION PASSED — write to DB ───────────────────
            var oldStatusId = job.JobStatusId;

            job.JobStatusId = dto.JobStatusId;
            job.UpdatedAt = DateTime.UtcNow;

            // Set StartedAt once when entering an active working state
            if (job.StartedAt == null)
            {
                bool isStartingStatus =
                    newStatus.Name.Contains("In Progress", StringComparison.OrdinalIgnoreCase) ||
                    newStatus.Name.Contains("In Transit", StringComparison.OrdinalIgnoreCase) ||
                    newStatus.Name.Contains("On Site", StringComparison.OrdinalIgnoreCase);

                if (isStartingStatus)
                    job.StartedAt = DateTime.UtcNow;
            }

            // Set CompletedAt once when entering a completed state
            if (job.CompletedAt == null)
            {
                bool isCompletedStatus =
                    newStatus.Name.Contains("Complet", StringComparison.OrdinalIgnoreCase) ||
                    newStatus.Name.Contains("Done", StringComparison.OrdinalIgnoreCase);

                if (isCompletedStatus)
                    job.CompletedAt = DateTime.UtcNow;
            }

            // Null nav props before Update — prevents EF Core relationship fixup
            // from overriding JobStatusId with the old job.JobStatus.Id.
            job.JobStatus = null;
            job.JobType = null;
            job.AssignedEmployee = null;

            _repository.Update(job);

            // Write history ONLY after all validation passes
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

            // Reload from DB — gets fresh nav properties (status name, employee name)
            var updated = await _repository.GetByIdAsync(job.Id, _currentUser.CompanyId);
            return Ok(MapToDto(updated!));
        }

        // ════════════════════════════════════════════════════════════════
        // UploadPhotoAsync — unchanged from your original
        // ════════════════════════════════════════════════════════════════
        public async Task<ApiResponse<JobPhotoDto>> UploadPhotoAsync(Guid id, UploadJobPhotoDto dto)
        {
            var job = await _repository.GetByIdAsync(id, _currentUser.CompanyId);
            if (job == null)
                return Fail<JobPhotoDto>("Job not found.");

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

        // ════════════════════════════════════════════════════════════════
        // API RESPONSE WRAPPERS — unchanged from your original
        // ════════════════════════════════════════════════════════════════
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
        // MAPPING HELPERS — unchanged from your original
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
                Priority = JobPriority.GetValue(job.Priority ?? "Medium"),
                PriorityLabel = job.Priority ?? "Medium",
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
            return new JobDetailDto
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
                Priority = JobPriority.GetValue(job.Priority ?? "Medium"),
                PriorityLabel = job.Priority ?? "Medium",
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
                    }).ToList() ?? [],

                Photos = job.JobPhotos?
                    .OrderBy(p => p.UploadedAt)
                    .Select(p => new JobPhotoDto
                    {
                        Id = p.Id,
                        PhotoUrl = p.PhotoUrl ?? string.Empty,
                        PhotoType = p.PhotoType ?? string.Empty,
                        UploadedAt = p.UploadedAt
                    }).ToList() ?? []
            };
        }
    }
}
