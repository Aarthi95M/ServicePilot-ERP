// ============================================================
// lib/hooks/useEmployees.ts
//
// React Query hooks for employee data.
// Components import these — never call employeesApi directly.
//
// PATTERN EXPLANATION:
// useQuery  → for GET requests (reading data)
// useMutation → for POST/PUT/DELETE (changing data)
//
// After a mutation succeeds, we call:
//   queryClient.invalidateQueries({ queryKey: ['employees'] })
// This tells React Query: "the employees cache is stale,
// refetch it next time someone needs it."
//
// .NET EQUIVALENT:
// Like clearing IMemoryCache after an update:
//   _cache.Remove("employees");
//   // Next request will reload from DB
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api/employees';
import type { CreateEmployeeDto, UpdateEmployeeDto, PagedEmployeeRequest } from '@/lib/types';

// Paged employee list with filters
// Usage: const { data, isLoading } = useEmployees({ page: 1, pageSize: 20, search: 'ahmed' })
export function useEmployees(params: PagedEmployeeRequest) {
  return useQuery({
    // queryKey includes params — different filters = different cache entries
    // e.g. ['employees', { page:1, search:'ahmed' }] ≠ ['employees', { page:2 }]
    queryKey: ['employees', params],
    queryFn: () => employeesApi.getPaged(params),
    staleTime: 30 * 1000,
    select: (response) => response.data, // unwrap ApiResponse<PagedResult<...>>
    // placeholderData keeps showing old results while new page loads
    // This prevents the table from flickering blank between page changes
    // .NET equivalent: showing cached results while new query runs
    placeholderData: (prev) => prev,
  });
}

// Single employee by ID
// Usage: const { data } = useEmployee(id)
export function useEmployee(id: string | null) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.getById(id!),
    staleTime: 30 * 1000,
    select: (response) => response.data,
    enabled: !!id, // only fetch when id is not null/empty
  });
}

// Expiring documents
export function useExpiringDocuments(days = 30) {
  return useQuery({
    queryKey: ['employees', 'expiring-docs', days],
    queryFn: () => employeesApi.getExpiringDocs(days),
    staleTime: 5 * 60 * 1000, // 5 minutes — changes less often
    select: (response) => response.data,
  });
}

// Create employee mutation
// Usage:
//   const createEmployee = useCreateEmployee()
//   createEmployee.mutate(dto, { onSuccess: () => setModalOpen(false) })
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateEmployeeDto) => employeesApi.create(dto),

    onSuccess: () => {
      // Invalidate ALL employee queries — list will refetch automatically
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

// Update employee mutation
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEmployeeDto }) =>
      employeesApi.update(id, dto),

    onSuccess: (_, variables) => {
      // Invalidate the specific employee AND the list
      queryClient.invalidateQueries({ queryKey: ['employees', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

// Deactivate (soft delete) employee mutation
export function useDeactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeesApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
