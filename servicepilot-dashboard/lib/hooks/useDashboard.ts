// ============================================================
// lib/hooks/useDashboard.ts
//
// WHAT THIS FILE IS:
// React Query hooks for dashboard data.
// These are the "data layer" — components import these hooks
// instead of calling the API directly.
//
// HOW REACT QUERY HOOKS WORK:
// useQuery wraps an API call and gives you:
//   data      → the API response (undefined while loading)
//   isLoading → true on the very first load (no cached data)
//   isFetching→ true whenever a fetch is happening (including background)
//   error     → the error if the API call failed
//   refetch   → call this to manually trigger a fresh fetch
//
// .NET EQUIVALENT:
// Like injecting IMemoryCache + IHttpClientFactory together:
//   var cached = await _cache.GetOrCreateAsync("dashboard", async entry => {
//     entry.SlidingExpiration = TimeSpan.FromSeconds(60);
//     return await _httpClient.GetAsync<AdminDashboardDto>("/dashboard/admin");
//   });
//
// KEY CONCEPT — queryKey:
// The queryKey is like a cache key in IMemoryCache.
// ['admin-dashboard'] → cache entry for the admin dashboard
// If any component calls useAdminDashboard() while the data
// is still fresh, they ALL get the cached version — zero API calls.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';
import { useAuthStore } from '@/lib/store/auth';

// Hook for Admin and HRManager dashboard
// Usage: const { data, isLoading, error } = useAdminDashboard()
export function useAdminDashboard() {
  return useQuery({
    // queryKey = cache key — must be unique per query
    // Adding 'admin-dashboard' as a string uniquely identifies this data
    queryKey: ['admin-dashboard'],

    // queryFn = the async function that fetches the data
    // React Query calls this when cache is empty or stale
    queryFn: dashboardApi.getAdmin,

    // staleTime = how long this data is "fresh" before React Query
    // refetches in the background (60 seconds for dashboard)
    staleTime: 60 * 1000,

    // select = transform the raw API response into just the data
    // Unwraps ApiResponse<AdminDashboardDto> → AdminDashboardDto
    // .NET equivalent: response.Data (accessing the DTO from wrapper)
    select: (response) => response.data,
  });
}

// Hook for Supervisor dashboard (branch-scoped)
export function useSupervisorDashboard() {
  return useQuery({
    queryKey: ['supervisor-dashboard'],
    queryFn: dashboardApi.getSupervisor,
    staleTime: 60 * 1000,
    select: (response) => response.data,
  });
}

// Smart hook — automatically picks the right dashboard based on role
// Usage: const { data, isLoading } = useDashboard()
// No need to check role in the component — the hook handles it
export function useDashboard() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  // For supervisor role — use supervisor endpoint
  const supervisorQuery = useQuery({
    queryKey: ['supervisor-dashboard'],
    queryFn: dashboardApi.getSupervisor,
    staleTime: 60 * 1000,
    select: (response) => response.data,
    // enabled = only run this query IF the user is a Supervisor
    // Disabled queries never fetch — like an if-statement for queries
    enabled: role === 'Supervisor',
  });

  // For admin/HRManager — use admin endpoint
  const adminQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: dashboardApi.getAdmin,
    staleTime: 60 * 1000,
    select: (response) => response.data,
    enabled: role === 'Admin' || role === 'HRManager',
  });

  // Return whichever query is relevant for the current role
  if (role === 'Supervisor') return supervisorQuery;
  return adminQuery;
}
