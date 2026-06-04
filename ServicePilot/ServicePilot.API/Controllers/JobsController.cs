using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServicePilot.Application.DTOs.Jobs;
using ServicePilot.Shared.Responses;
using ServicePilot.Application.Interfaces.Services;
using ServicePilot.Domain.Constants;

namespace ServicePilot.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class JobsController : ControllerBase
    {
        private readonly IJobService _service;

        public JobsController(IJobService service)
        {
            _service = service;
        }

        /// <summary>
        /// Create a new job.
        /// Dispatcher added — their core responsibility is creating jobs from customer calls.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = Roles.JobWriteAccess)]      // Admin,Supervisor,Dispatcher
        public async Task<IActionResult> Create([FromBody] CreateJobDto dto)
        {
            var response = await _service.CreateAsync(dto);
            return response.Success
                ? CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response)
                : BadRequest(response);
        }

        /// <summary>
        /// Paged job list.
        /// Dispatcher added — they need to see all jobs to coordinate scheduling.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = Roles.JobWriteAccess)]      // Admin,Supervisor,Dispatcher
        public async Task<IActionResult> GetPaged([FromQuery] PagedJobRequest filter)
        {
            var response = await _service.GetPagedAsync(filter);
            return Ok(response);
        }

        /// <summary>
        /// Full job detail.
        /// Employee can view their own job details.
        /// </summary>
        [HttpGet("{id:guid}")]
        [Authorize(Roles = Roles.JobReadAccess)]       // Admin,Supervisor,Dispatcher,Employee
        public async Task<IActionResult> GetById(Guid id)
        {
            var response = await _service.GetByIdAsync(id);
            return response.Success ? Ok(response) : NotFound(response);
        }

        /// <summary>
        /// Update job details.
        /// Dispatcher added — they rescheduled and update job details frequently.
        /// </summary>
        [HttpPut("{id:guid}")]
        [Authorize(Roles = Roles.JobWriteAccess)]      // Admin,Supervisor,Dispatcher
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateJobDto dto)
        {
            var response = await _service.UpdateAsync(id, dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Assign/reassign employee to job.
        /// Dispatcher added — reassigning is their primary daily task.
        /// </summary>
        [HttpPut("{id:guid}/assign")]
        [Authorize(Roles = Roles.JobWriteAccess)]      // Admin,Supervisor,Dispatcher
        public async Task<IActionResult> Assign(Guid id, [FromBody] AssignJobDto dto)
        {
            var response = await _service.AssignAsync(id, dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Move job to new status.
        /// Dispatcher can also update status (e.g. cancel a job, mark as scheduled).
        /// Employee: own jobs only (enforced at service layer).
        /// </summary>
        [HttpPut("{id:guid}/status")]
        [Authorize(Roles = Roles.JobReadAccess)]       // Admin,Supervisor,Dispatcher,Employee
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateJobStatusDto dto)
        {
            var response = await _service.UpdateStatusAsync(id, dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Upload photo.
        /// Dispatcher does not upload photos — field roles only.
        /// </summary>
        [HttpPost("{id:guid}/photos")]
        [Authorize(Roles = Roles.JobReadAccess)]       // Admin,Supervisor,Dispatcher,Employee
        public async Task<IActionResult> UploadPhoto(Guid id, [FromBody] UploadJobPhotoDto dto)
        {
            var response = await _service.UploadPhotoAsync(id, dto);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// Delete job. Admin only — Dispatcher cannot delete.
        /// </summary>
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = Roles.Admin)]               // Admin only
        public async Task<IActionResult> Delete(Guid id)
        {
            var response = await _service.DeleteAsync(id);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        /// <summary>
        /// My assigned jobs — mobile app.
        /// Returns paged + status-filtered list for the authenticated employee.
        /// Query params: page (default 1), pageSize (default 20), jobStatusId (optional GUID).
        /// Dispatcher does not have field assignments but the role is still allowed here
        /// so admins can test the endpoint.
        /// </summary>
        [HttpGet("my-jobs")]
        [Authorize(Roles = Roles.JobReadAccess)]       // Admin,Supervisor,Dispatcher,Employee
        public async Task<IActionResult> GetMyJobs([FromQuery] MyJobsRequest filter)
        {
            var response = await _service.GetMyJobsAsync(filter);
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}
