import apiClient from './client';

// Shape returned by GET /api/lookups/job-statuses
// Matches JobStatusDropdownDto from the backend (camelCase via ASP.NET serialiser):
//   { id, label, colorCode, displayOrder }
// NOTE: The backend filters to only IsActive rows, so there is no isActive field here.
export interface JobStatusLookup {
  id: string;
  label: string;      // display name, e.g. "Assigned", "In Transit", "Completed"
  colorCode: string;  // hex colour, e.g. "#2563eb"
  displayOrder: number;
}

export const lookupsApi = {
  /**
   * Returns all active job statuses for the company.
   * Used by the Jobs screen to populate the filter pills dynamically
   * instead of using hardcoded status names that drift from the DB.
   * Endpoint: GET /api/lookups/job-statuses
   */
  getJobStatuses: (): Promise<JobStatusLookup[]> =>
    apiClient
      .get('/lookups/job-statuses')
      .then((r) => r.data?.data ?? []),
};
