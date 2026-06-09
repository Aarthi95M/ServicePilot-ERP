"use client";
// ============================================================
// app/(auth)/login/page.tsx
//
// WHAT 'use client' MEANS:
// Next.js App Router runs components on the server by default.
// We need 'use client' here because we use:
//   - useState  (form state, loading, error)
//   - useRouter (navigate to /dashboard after login)
//   - browser events (form submit, button click)
// These only work in the browser, not on the server.
//
// .NET EQUIVALENT:
// A Razor Page with a PageModel handling OnPostAsync()
// ============================================================

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/auth";
import type { AuthUser } from "@/lib/types";

// Next.js requires Suspense when using useSearchParams
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/dashboard";
  const { login } = useAuthStore();

  // useState — like a ViewModel field that triggers re-render on change
  // const [value, setValue] = useState(initialValue)
  const [email, setEmail] = useState("admin@techforce.ae");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // useMutation — React Query's way to handle POST calls
  // .NET equivalent: calling an async service method that changes data
  // isPending = true while the API call is in flight (show spinner)
  const loginMutation = useMutation({
    mutationFn: authApi.login,

    onSuccess: (response) => {
      if (!response.success || !response.data) {
        setErrorMessage(response.message || "Invalid email or password.");
        return;
      }

      const {
        token,
        userId,
        companyId,
        email: userEmail,
        role,
      } = response.data;

      const authUser: AuthUser = {
        userId,
        companyId,
        email: userEmail,
        role: role as AuthUser["role"],
        token,
      };

      // Save to Zustand store — pass rememberMe so the store uses
      // localStorage (remember=true) or sessionStorage (remember=false)
      login(authUser, rememberMe);

      // Save token in cookie so middleware.ts (server-side) can read it.
      // max-age: 30 days if remembered, 8 hours if not (session cookie).
      document.cookie = `sp-token=${token}; path=/; max-age=${
        rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8
      }; SameSite=Strict`;

      router.push(redirectTo);
    },

    onError: (error: any) => {
      setErrorMessage(
        error?.message || "Something went wrong. Please try again.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // prevent browser page reload
    setErrorMessage(null);
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="flex min-h-screen">
      {/* LEFT PANEL: white form */}
      <div className="flex w-[42%] min-w-[420px] flex-col bg-white px-14 py-12">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-12">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-btn flex-shrink-0">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          </div>
          <div>
            <div className="text-[17px] font-bold text-gray-900 leading-tight">
              ServicePilot
            </div>
            <div className="text-[11px] text-gray-400">
              Workforce &amp; Field Service Management
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center max-w-[360px]">
          {/* Language toggle */}
          <div className="flex justify-end mb-5">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              العربية
            </button>
          </div>

          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight mb-1.5">
            Sign in
          </h1>
          <p className="text-[14px] text-gray-500 mb-8">
            Enter your company credentials to continue
          </p>

          {/* Error — only renders when errorMessage is not null */}
          {/* In React: {condition && <element>} = @if (condition) { } in Razor */}
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                className="mb-1.5 block text-[13px] font-medium text-gray-700"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@techforce.ae"
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/10 transition-colors"
              />
            </div>

            {/* Password with show/hide */}
            <div>
              <label
                className="mb-1.5 block text-[13px] font-medium text-gray-700"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 pr-11 text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 accent-blue-600"
                />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="text-[13px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit — disabled while loading */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-btn px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-btn-hover disabled:cursor-not-allowed disabled:opacity-80"
            >
              {loginMutation.isPending ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT PANEL: blue showcase */}
      <div
        className="relative flex flex-1 flex-col overflow-hidden p-12"
        style={{
          background: "linear-gradient(145deg, #1a3a8f 0%, #0d1f5c 100%)",
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative flex flex-1 flex-col justify-center">
          {/* Live pill */}
          <div
            className="mb-8 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[12px] font-medium text-white/90 backdrop-blur-sm"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Technician Map Active
          </div>

          <h2 className="mb-4 text-[36px] font-bold leading-tight tracking-tight text-white">
            Your Team,
            <br />
            Always Connected
          </h2>

          <p className="mb-9 max-w-[420px] text-[15px] leading-relaxed text-white/60">
            GPS check-in, job dispatch, leave management and Excel reports —
            built for UAE field service companies.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                color: "rgba(52,211,153,0.15)",
                ic: "#34d399",
                title: "GPS Attendance",
                desc: "Check-in/out with live map & offline sync",
                path: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
              },
              {
                color: "rgba(251,191,36,0.15)",
                ic: "#fbbf24",
                title: "Job Management",
                desc: "Dispatch, assign & track field jobs",
                path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
              },
              {
                color: "rgba(167,139,250,0.15)",
                ic: "#a78bfa",
                title: "Leave & Overtime",
                desc: "Requests, approvals & HR workflow",
                path: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
              },
              {
                color: "rgba(96,165,250,0.15)",
                ic: "#60a5fa",
                title: "Reports & Export",
                desc: "Excel exports for attendance, jobs & compliance",
                path: "M18 20V10 M12 20V4 M6 20v-6",
              },
            ].map(({ color, ic, title, desc, path }) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.11]"
              >
                <div
                  className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: color, color: ic }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {path.split(" M").map((d, i) => (
                      <path key={i} d={i === 0 ? d : "M" + d} />
                    ))}
                  </svg>
                </div>
                <div className="text-[13px] font-semibold text-white mb-0.5">
                  {title}
                </div>
                <div className="text-[12px] text-white/50">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
