// lib/hooks/useLookups.ts
// Loads all dropdown data in one call — branches, departments, positions, job types etc.
// Used by forms throughout the app.

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

async function fetchLookups() {
  const [branches, departments, positions, jobStatuses, jobTypes, leaveTypes] = await Promise.all([
    apiClient.get('/lookups/branches').then(r => r.data.data),
    apiClient.get('/lookups/departments').then(r => r.data.data),
    apiClient.get('/lookups/positions').then(r => r.data.data),
    apiClient.get('/lookups/job-statuses').then(r => r.data.data),
    apiClient.get('/lookups/job-types').then(r => r.data.data),
    apiClient.get('/lookups/leave-types').then(r => r.data.data),
  ]);
  return { branches, departments, positions, jobStatuses, jobTypes, leaveTypes };
}

export function useLookups() {
  return useQuery({
    queryKey: ['lookups'],
    queryFn: fetchLookups,
    staleTime: 10 * 60 * 1000, // 10 minutes — lookups rarely change
  });
}
