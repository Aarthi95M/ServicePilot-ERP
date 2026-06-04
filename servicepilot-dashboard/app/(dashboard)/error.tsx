'use client';
// app/(dashboard)/error.tsx
// Dashboard-scoped error boundary — catches render errors within any
// (dashboard) page without taking down the entire app.
// The sidebar/header are unaffected — only the <main> area shows this.

import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      {/* Icon */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>

      <h2 className="mb-2 text-[18px] font-bold text-gray-900">
        Something went wrong
      </h2>
      <p className="mb-1 max-w-sm text-[13px] text-gray-500">
        This page encountered an unexpected error. Your other pages are unaffected.
      </p>
      {error.digest && (
        <p className="mb-6 font-mono text-[11px] text-gray-400">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-btn px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-btn-hover"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
