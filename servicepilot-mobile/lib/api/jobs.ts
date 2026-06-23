import apiClient from './client';

export interface PagedJobsResult {
  items: any[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const jobsApi = {
  /**
   * Returns the current employee's assigned jobs — paged + filterable.
   * jobStatusId: pass the Guid from /api/lookups/job-statuses to filter;
   *              omit to return all statuses.
   *
   * The backend returns ApiResponse<PagedResult<JobResponseDto>>.
   * We unwrap to data.data = { items, totalCount, page, pageSize }.
   *
   * Defensive: if the backend still returns a flat array (old code not yet
   * restarted), we normalise it to the paged shape so the UI doesn't break.
   */
  getMyJobs: (params?: {
    page?: number;
    pageSize?: number;
    jobStatusId?: string;
  }): Promise<PagedJobsResult> =>
    apiClient
      .get('/jobs/my-jobs', { params })
      .then((r) => {
        const d = r.data?.data;
        // Old backend: returned a flat array directly
        if (Array.isArray(d)) {
          return { items: d, totalCount: d.length, page: 1, pageSize: d.length } as PagedJobsResult;
        }
        // New backend: returns { items, totalCount, page, pageSize }
        return (d ?? { items: [], totalCount: 0, page: 1, pageSize: 20 }) as PagedJobsResult;
      }),

  getById: (id: string) =>
    apiClient.get(`/jobs/${id}`).then((r) => r.data.data),

  updateStatus: (id: string, statusId: string, notes?: string) =>
    apiClient.put(`/jobs/${id}/status`, { jobStatusId: statusId, notes }).then((r) => r.data),

  uploadPhoto: (id: string, base64: string, caption?: string) =>
    apiClient.post(`/jobs/${id}/photos`, {
      photoType:   'Progress',
      photoBase64: base64,
      caption:     caption ?? 'photo.jpg',
    }).then((r) => r.data),

  deletePhoto: (jobId: string, photoId: string) =>
    apiClient.delete(`/jobs/${jobId}/photos/${photoId}`).then((r) => r.data),
};
