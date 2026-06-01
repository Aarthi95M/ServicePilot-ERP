import apiClient from './client';

export interface CreateLeavePayload {
  leaveTypeId: string;
  startDate:   string;  // ISO date string
  endDate:     string;
  reason?:     string;
}

export const leaveApi = {
  getMyRequests: (params?: { page?: number; status?: string }) =>
    apiClient.get('/leave/my-requests', { params }).then(r => r.data.data),

  create: (payload: CreateLeavePayload) =>
    apiClient.post('/leave', payload).then(r => r.data),

  cancel: (id: string) =>
    apiClient.put(`/leave/${id}/cancel`).then(r => r.data),

  // Leave types for the dropdown
  getLeaveTypes: () =>
    apiClient.get('/lookups/leave-types').then(r => r.data.data),
};
