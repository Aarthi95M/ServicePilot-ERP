namespace ServicePilot.Application.DTOs.Jobs
{
    /// <summary>
    /// Query parameters for GET /jobs/my-jobs (mobile employee view).
    /// Keeps the surface small — employees only need page, size, and status filter.
    /// </summary>
    public class MyJobsRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;

        /// <summary>
        /// Filter by a specific job status ID.
        /// Null = return all statuses.
        /// The mobile app fetches available statuses from GET /lookups/job-statuses.
        /// </summary>
        public Guid? JobStatusId { get; set; }
    }
}
