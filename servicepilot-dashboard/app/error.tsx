'use client';
// app/error.tsx
// Root-level error boundary — catches unhandled React render errors
// anywhere in the app that aren't caught by a nested error.tsx.
//
// Next.js requires:
//  - 'use client' (error boundaries must be client components)
//  - default export named `Error`
//  - props: { error: Error & { digest?: string }; reset: () => void }

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your error tracking service (e.g. Sentry, Datadog) here
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <h1 className="mb-2 text-[22px] font-bold tracking-tight text-gray-900">
          Something went wrong
        </h1>
        <p className="mb-8 text-[14px] leading-relaxed text-gray-500">
          An unexpected error occurred. Please try again, or contact support if
          the problem persists.
          {error.digest && (
            <span className="mt-2 block font-mono text-[11px] text-gray-400">
              Error ID: {error.digest}
            </span>
          )}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-btn px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-btn-hover"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
