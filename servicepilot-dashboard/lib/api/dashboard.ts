// ============================================================
// lib/api/dashboard.ts
//
// WHAT THIS FILE IS:
// Typed API functions for all dashboard endpoints.
// One function per backend endpoint in DashboardController.cs
//
// .NET EQUIVALENT:
// Like a typed HttpClient service:
//   public class DashboardApiService {
//     public async Task<AdminDashboardDto> GetAdminDashboardAsync() { }
//   }
// ============================================================

import apiClient from './client';
import type { ApiResponse, AdminDashboardDto } from '@/lib/types';

export const dashboardApi = {

  // GET /api/dashboard/admin
  // Roles: Admin, HRManager
  // Returns the full company-wide dashboard data in one call
  getAdmin: async (): Promise<ApiResponse<AdminDashboardDto>> => {
    const response = await apiClient.get<ApiResponse<AdminDashboardDto>>(
      '/dashboard/admin'
    );
    return response.data;
  },

  // GET /api/dashboard/supervisor
  // Roles: Supervisor
  // Same structure as admin but branch-scoped
  getSupervisor: async (): Promise<ApiResponse<AdminDashboardDto>> => {
    const response = await apiClient.get<ApiResponse<AdminDashboardDto>>(
      '/dashboard/supervisor'
    );
    return response.data;
  },

  // GET /api/dashboard/me
  // Roles: Technician, Supervisor, Admin
  // Personal dashboard for mobile app home screen
  getMe: async (): Promise<ApiResponse<AdminDashboardDto>> => {
    const response = await apiClient.get<ApiResponse<AdminDashboardDto>>(
      '/dashboard/me'
    );
    return response.data;
  },
};
