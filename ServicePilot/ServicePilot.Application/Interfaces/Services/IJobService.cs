using ServicePilot.Application.DTOs.Jobs;
using ServicePilot.Shared.Responses;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ServicePilot.Application.Interfaces.Services
{
    public interface IJobService
    {
        Task<ApiResponse<JobResponseDto>> CreateAsync(CreateJobDto dto);
        Task<ApiResponse<JobDetailDto>> GetByIdAsync(Guid id);
        Task<ApiResponse<PagedResult<JobResponseDto>>> GetPagedAsync(PagedJobRequest filter);
        Task<ApiResponse<PagedResult<JobResponseDto>>> GetMyJobsAsync(MyJobsRequest filter);
        Task<ApiResponse<JobResponseDto>> UpdateAsync(Guid id, UpdateJobDto dto);
        Task<ApiResponse<JobResponseDto>> AssignAsync(Guid id, AssignJobDto dto);
        Task<ApiResponse<JobResponseDto>> UpdateStatusAsync(Guid id, UpdateJobStatusDto dto);
        Task<ApiResponse<JobPhotoDto>> UploadPhotoAsync(Guid id, UploadJobPhotoDto dto);
        Task<ApiResponse<bool>> DeletePhotoAsync(Guid jobId, Guid photoId);
        Task<ApiResponse<bool>> DeleteAsync(Guid id);
    }
}
