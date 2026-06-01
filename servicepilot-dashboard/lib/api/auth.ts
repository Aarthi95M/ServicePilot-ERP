// ============================================================
// lib/api/auth.ts
//
// WHAT THIS FILE IS:
// Typed functions for the Auth API endpoints.
// Every endpoint in your AuthController.cs has a function here.
//
// PATTERN USED THROUGHOUT THE PROJECT:
// One file per backend module:
//   lib/api/auth.ts        → AuthController
//   lib/api/employees.ts   → EmployeesController
//   lib/api/jobs.ts        → JobsController
//   lib/api/attendance.ts  → AttendanceController
//   lib/api/leave.ts       → LeaveController
//   lib/api/dashboard.ts   → DashboardController
//   lib/api/reports.ts     → ReportsController
//
// .NET EQUIVALENT:
// Like a typed HttpClient service class:
//   public class AuthApiService {
//     public async Task<ApiResponse<LoginResponseDto>> LoginAsync(LoginRequestDto dto)
//     { ... }
//   }
//
// WHY NOT CALL AXIOS DIRECTLY IN COMPONENTS:
// If you call axios directly in a component, you'd need to:
//   - Repeat the URL in every component
//   - Repeat error handling everywhere
//   - Lose TypeScript type safety
// These functions give you ONE place to change URLs and types.
// ============================================================

import apiClient from './client';
import type { ApiResponse, LoginRequestDto, LoginResponseDto } from '@/lib/types';

// ── Auth API object ──────────────────────────────────────────
// We group all auth functions in one object so imports are clean:
//   import { authApi } from '@/lib/api/auth'
//   authApi.login({ email, password })

export const authApi = {
  // POST /api/auth/login
  // .NET: AuthController.Login()
  //
  // Returns the JWT token + user info on success.
  // The login page calls this, then stores the result in Zustand.
  //
  // HOW REACT QUERY MUTATION USES THIS:
  //   const loginMutation = useMutation({
  //     mutationFn: authApi.login,
  //     onSuccess: (data) => {
  //       authStore.login(data.data!)  // store token in Zustand
  //       router.push('/dashboard')    // navigate to dashboard
  //     }
  //   })
  //   loginMutation.mutate({ email, password })
  login: async (dto: LoginRequestDto): Promise<ApiResponse<LoginResponseDto>> => {
    // .then(r => r.data) extracts the response body from Axios
    // Axios wraps the response in { data, status, headers, ... }
    // We only want the data (your ApiResponse<LoginResponseDto>)
    const response = await apiClient.post<ApiResponse<LoginResponseDto>>(
      '/auth/login',
      dto
    );
    return response.data;
  },
};
