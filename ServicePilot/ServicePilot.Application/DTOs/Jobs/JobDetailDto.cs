using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.DTOs.Jobs
{
    /// <summary>
    /// Full job detail — includes status history and photos.
    /// Used by GET /api/jobs/{id}.
    /// </summary>
    public class JobDetailDto : JobResponseDto
    {
        public List<JobStatusHistoryDto> StatusHistory { get; set; } = new();
        public List<JobPhotoDto> Photos { get; set; } = new();
    }

    public class JobStatusHistoryDto
    {
        public Guid Id { get; set; }
        public string? OldStatusName { get; set; }
        public string NewStatusName { get; set; } = string.Empty;
        public string? ChangedByName { get; set; }

        /// <summary>Comment entered by the user when they changed the status, if any.</summary>
        public string? Notes { get; set; }
        public DateTime ChangedAt { get; set; }
    }

    public class JobPhotoDto
    {
        public Guid Id { get; set; }
        public string PhotoUrl { get; set; } = string.Empty;

        /// <summary>Before | After | Progress | Signature</summary>
        public string PhotoType { get; set; } = string.Empty;
        public Guid? UploadedByUserId { get; set; }
        public DateTime UploadedAt { get; set; }
        public bool CanDelete { get; set; }
    }
}
