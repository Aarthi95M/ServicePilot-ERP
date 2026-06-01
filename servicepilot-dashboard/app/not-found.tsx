// app/not-found.tsx
// Rendered automatically by Next.js for any URL that doesn't match a route.
// This is a Server Component — no 'use client' needed.
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md text-center">
        {/* Illustration */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="12"/>
            <line x1="11" y1="16" x2="11.01" y2="16"/>
          </svg>
        </div>

        {/* Copy */}
        <h1 className="mb-2 text-[28px] font-bold tracking-tight text-gray-900">
          Page not found
        </h1>
        <p className="mb-1 text-[15px] font-semibold text-blue-600">404</p>
        <p className="mb-8 text-[14px] leading-relaxed text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Go to Dashboard
          </Link>
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Go back
          </Link>
        </div>
      </div>
    </div>
  );
}
