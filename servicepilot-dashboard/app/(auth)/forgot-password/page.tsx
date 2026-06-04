'use client';
// app/(auth)/forgot-password/page.tsx
// Users enter their email address here.
// Backend generates a reset token and (eventually) sends it via email.
// We always show a success message to avoid leaking whether the email exists.

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiClient.post('/auth/forgot-password', { email });
      return res.data;
    },
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18C1.61 2.09 2.46 1 3.55 1h3a2 2 0 0 1 2 1.72c.13.96.39 1.9.77 2.79a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 5.5 5.5l.97-.97a2 2 0 0 1 2.11-.45c.89.38 1.83.64 2.79.77A2 2 0 0 1 21 15.5v.42"/>
              <polyline points="22 6 12 17 9 14"/>
            </svg>
          </div>
          <h2 className="mb-2 text-[18px] font-bold text-gray-900">Check your email</h2>
          <p className="mb-8 text-[13px] text-gray-500">
            If <strong>{email}</strong> is registered, you&apos;ll receive a reset link shortly.
            The link expires in 1 hour.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-btn px-6 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-btn-hover"
          >
            Back to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <span className="text-[16px] font-bold text-gray-900">ServicePilot</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-gray-900">
              Forgot your password?
            </h1>
            <p className="mt-1.5 text-[13px] text-gray-500">
              Enter your email and we&apos;ll send a reset link.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              Something went wrong. Please try again.
            </div>
          )}

          <form
            onSubmit={e => { e.preventDefault(); mutate(email); }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/10 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-btn px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-btn-hover disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Sending...
                </>
              ) : 'Send reset link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-700"
            >
              ← Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
