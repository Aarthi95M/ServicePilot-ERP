import apiClient from './client';

export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data).then(r => r.data),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then(r => r.data),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }).then(r => r.data),

  registerDeviceToken: (expoPushToken: string) =>
    apiClient.post('/auth/device-token', { token: expoPushToken }).then(r => r.data),

  unregisterDeviceToken: (expoPushToken: string) =>
    apiClient.delete('/auth/device-token', { data: { token: expoPushToken } }).then(r => r.data),
};
