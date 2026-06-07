import apiClient from './client';

export interface CreateOvertimePayload {
  requestDate:     string;  // ISO date
  hoursRequested:  number;
  reason?:         string;
}

export const overtimeApi = {
  getMyRequests: (params?: { page?: number; pageSize?: number; status?: string }) =>
    apiClient.get('/overtime/my-requests', { params }).then(r => r.data.data ?? r.data),

  create: (payload: CreateOvertimePayload) =>
    apiClient.post('/overtime', payload).then(r => r.data),

  cancel: (id: string) =>
    apiClient.put(`/overtime/${id}/cancel`).then(r => r.data),
};
