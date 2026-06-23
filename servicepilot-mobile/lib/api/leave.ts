import apiClient from './client';

export interface CreateLeavePayload {
  leaveTypeId: string;
  startDate:   string;  // YYYY-MM-DD
  endDate:     string;  // YYYY-MM-DD
  reason?:     string;
}

export const leaveApi = {
  getMyRequests: (params?: { page?: number; pageSize?: number; status?: string }) =>
    apiClient.get('/leave/my-requests', { params }).then(r => r.data.data ?? r.data),

  create: (payload: CreateLeavePayload) =>
    apiClient.post('/leave', payload).then(r => r.data),

  cancel: (id: string) =>
    apiClient.put(`/leave/${id}/cancel`).then(r => r.data),

  // Leave types for the dropdown — handle both wrapped and array responses
  getLeaveTypes: () =>
    apiClient.get('/lookups/leave-types').then(r => r.data.data ?? r.data ?? []),

  getMyBalance: () =>
    apiClient.get('/leave/my-balance').then(r => r.data.data ?? r.data ?? []),
};
