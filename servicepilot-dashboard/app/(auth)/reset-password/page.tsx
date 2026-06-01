'use client';
// app/(auth)/reset-password/page.tsx
// The user lands here from the email link: /reset-password?token=<raw-token>
// They enter a new password; we POST it along with the token to the backend.

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

// Suspense wrapper required for useSearchParams in the App Router
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState('');
  const [success, setSuccess] = useState(false);

  const { mutate, isPending, error: mutationError } = useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      const res = await apiClient.post('/auth/reset-password', { token, newPassword });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setClientError(data.message || 'Password reset failed.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError('');
    if (password.length < 8) {
      setClientError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setClientError('Passwords do not match.');
      return;
    }
    mutate({ token, newPassword: password });
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
          <p className="text-[14px] font-medium text-red-600">
            Invalid reset link. Please request a new one.
          </p>
          <Link href="/forgot-password" className="mt-4 inline-block text-[13px] font-medium text-blue-600 hover:text-blue-800">
            Request new link →
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="mb-2 text-[18px] font-bold text-gray-900">Password updated!</h2>
          <p className="mb-6 text-[13px] text-gray-500">
            Your password has been reset. Redirecting to sign in...
          </p>
          <Link href="/login" className="text-[13px] font-medium text-blue-600 hover:text-blue-800">
            Sign in now →
          </Link>
        </div>
      </div>
    );
  }

  const errorMsg = clientError || ((mutationError as any)?.response?.data?.message ?? (mutationError ? 'Something went wrong.' : ''));

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <span className="text-[16px] font-bold text-gray-900">ServicePilot</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
          <div className="mb-7 text-center">
            <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Set new password</h1>
            <p className="mt-1.5 text-[13px] text-gray-500">
              Choose a strong password of at least 8 characters.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-gray-700">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 pr-11 text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-[13px] font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/10 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Updating...
                </>
              ) : 'Set New Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-700">
              ← Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
