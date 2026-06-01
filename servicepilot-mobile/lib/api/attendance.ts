import apiClient from './client';

export interface CheckInPayload {
  latitude:  number;
  longitude: number;
  notes?:    string;
}

export interface GpsLogPayload {
  latitude:  number;
  longitude: number;
  accuracy?: number;
}

export const attendanceApi = {
  // Today's record for the logged-in user
  getToday: () =>
    apiClient.get('/attendance/today').then(r => r.data.data),

  checkIn: (payload: CheckInPayload) =>
    apiClient.post('/attendance/checkin', payload).then(r => r.data),

  checkOut: (payload: CheckInPayload) =>
    apiClient.post('/attendance/checkout', payload).then(r => r.data),

  logGps: (payload: GpsLogPayload) =>
    apiClient.post('/attendance/gps-log', payload).then(r => r.data),

  // History list (paged)
  getHistory: (page = 1, pageSize = 20) =>
    apiClient.get('/attendance', { params: { page, pageSize } }).then(r => r.data.data),
};
