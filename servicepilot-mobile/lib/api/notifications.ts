import apiClient from './client';

export const notificationsApi = {
  getAll: (page = 1, pageSize = 20) =>
    apiClient.get('/notifications', { params: { page, pageSize } }).then(r => r.data.data),

  getUnreadCount: () =>
    apiClient.get('/notifications/unread-count').then(r => r.data.data ?? 0),

  markRead: (id: string) =>
    apiClient.put(`/notifications/${id}/read`).then(r => r.data),

  markAllRead: () =>
    apiClient.put('/notifications/read-all').then(r => r.data),
};
