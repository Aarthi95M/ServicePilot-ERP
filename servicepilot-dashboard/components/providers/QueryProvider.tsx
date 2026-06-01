'use client';
// ============================================================
// components/providers/QueryProvider.tsx
//
// WHAT THIS FILE IS:
// Sets up React Query (TanStack Query) for the entire app.
// Needs to be a separate file from layout.tsx because it uses
// 'use client' — layout.tsx is a Server Component by default.
//
// WHY 'use client':
// Next.js App Router runs components on the SERVER by default.
// useState, useEffect, and browser APIs only work on the CLIENT.
// 'use client' tells Next.js: "this component and everything
// it renders needs to run in the browser."
//
// .NET EQUIVALENT:
// There's no direct equivalent, but think of it like:
// - QueryClient = IMemoryCache registered in Program.cs
// - QueryClientProvider = the DI container that makes the
//   cache available everywhere via injection
//
// WHAT REACT QUERY DOES:
// Every time a component calls useQuery({ queryKey: ['employees'] }),
// React Query:
//   1. Checks if 'employees' data is already cached
//   2. If YES and fresh → returns cached data (no API call)
//   3. If NO or stale  → calls the API, caches the result
//   4. Shows loading state while fetching
//   5. Shows error state if the API fails
//   6. Automatically refetches in the background
//
// This replaces dozens of useState/useEffect patterns you'd
// otherwise write manually in every component.
// ============================================================

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Default cache configuration ──────────────────────────────
// These settings control how React Query caches data globally.
// Individual useQuery() calls can override these per-query.

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // staleTime: how long before data is considered "stale"
        // Stale data = React Query will refetch it in the background
        // 30 seconds for most data — dashboard stats, employee lists
        // .NET equivalent: MemoryCacheEntryOptions.SlidingExpiration
        staleTime: 30 * 1000,

        // gcTime: how long to keep unused data in cache before removing
        // (formerly called cacheTime)
        gcTime: 5 * 60 * 1000, // 5 minutes

        // retry: how many times to retry a failed request
        // Set to 1 so we don't spam the API on errors
        retry: 1,

        // refetchOnWindowFocus: refetch when user switches back to tab
        // Useful for live data like attendance dashboard
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Don't retry mutations (POST/PUT/DELETE) automatically
        // because re-sending could create duplicate records
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState here ensures QueryClient is created once per session
  // and not re-created on every render
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
