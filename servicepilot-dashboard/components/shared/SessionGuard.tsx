'use client';
// components/shared/SessionGuard.tsx
//
// Watches the JWT expiry and shows a warning banner 5 minutes before
// the session expires.  Gives the user a chance to save their work
// before they get hard-redirected mid-action by the 401 interceptor.
//
// How it works:
//  1. On mount, decode the `exp` claim from the JWT stored in localStorage.
//  2. Set a timer to fire 5 minutes before expiry → show yellow banner.
//  3. Set a second timer to fire at expiry → redirect to /login automatically.
//
// The banner shows a countdown (minutes remaining) and two buttons:
//  "Sign in again" → redirects to /login?from=<current-path> so the user
//                    lands back on the same page after re-authenticating.
//  "Dismiss"       → hides the banner until the hard expiry fires.

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';

const WARN_BEFORE_MS = 5 * 60 * 1000; // show warning 5 min before expiry

function getJwtExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null; // convert to ms
  } catch {
    return null;
  }
}

export function SessionGuard() {
  const { token, logout } = useAuthStore();
  const pathname           = usePathname();
  const router             = useRouter();

  const [showBanner, setShowBanner]   = useState(false);
  const [minsLeft,   setMinsLeft]     = useState(5);
  const [dismissed,  setDismissed]    = useState(false);

  const handleSignInAgain = useCallback(() => {
    logout();
    document.cookie = 'sp-token=; path=/; max-age=0';
    router.push(`/login?from=${encodeURIComponent(pathname)}`);
  }, [logout, router, pathname]);

  useEffect(() => {
    const storedToken = token ?? localStorage.getItem('sp-token');
    const expiry = getJwtExpiry(storedToken);
    if (!expiry) return;

    const now = Date.now();
    const msToExpiry = expiry - now;

    // Already expired — middleware should redirect, but handle it here too
    if (msToExpiry <= 0) {
      handleSignInAgain();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Timer 1: show warning banner 5 min before expiry
    const warnAt = msToExpiry - WARN_BEFORE_MS;
    if (warnAt > 0) {
      timers.push(setTimeout(() => {
        setDismissed(false);
        setShowBanner(true);
      }, warnAt));
    } else {
      // Already inside the 5-min window — show the banner immediately
      setShowBanner(true);
    }

    // Timer 2: redirect at expiry
    timers.push(setTimeout(() => {
      handleSignInAgain();
    }, msToExpiry));

    // Countdown tick — update minsLeft every 30 s while banner is visible
    const tick = setInterval(() => {
      const remaining = expiry - Date.now();
      setMinsLeft(Math.max(0, Math.ceil(remaining / 60_000)));
      if (remaining <= 0) clearInterval(tick);
    }, 30_000);
    // Set initial value
    setMinsLeft(Math.max(0, Math.ceil((expiry - Date.now()) / 60_000)));

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tick);
    };
  }, [token, handleSignInAgain]);

  if (!showBanner || dismissed) return null;

  return (
    <div className="sticky top-[60px] z-30 flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2.5">
      {/* Icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="flex-shrink-0">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>

      <span className="flex-1 text-[13px] font-medium text-amber-800">
        Your session expires in{' '}
        <strong>{minsLeft} minute{minsLeft !== 1 ? 's' : ''}</strong>.
        {' '}Save any unsaved changes before signing in again.
      </span>

      <button
        onClick={handleSignInAgain}
        className="flex-shrink-0 rounded-lg bg-amber-600 px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-amber-700"
      >
        Sign in again
      </button>

      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-medium text-amber-700 transition-colors hover:bg-amber-50"
      >
        Dismiss
      </button>
    </div>
  );
}
