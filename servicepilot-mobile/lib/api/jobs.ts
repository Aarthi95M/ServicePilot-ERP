import apiClient from './client';

export const jobsApi = {
  // Only the authenticated technician's assigned jobs
  getMyJobs: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get('/jobs/my-jobs', { params }).then(r => r.data.data),

  getById: (id: string) =>
    apiClient.get(`/jobs/${id}`).then(r => r.data.data),

  updateStatus: (id: string, statusId: string, notes?: string) =>
    apiClient.put(`/jobs/${id}/status`, { jobStatusId: statusId, notes }).then(r => r.data),

  uploadPhoto: (id: string, base64: string, caption?: string) =>
    apiClient.post(`/jobs/${id}/photos`, { photoBase64: base64, caption }).then(r => r.data),
};
