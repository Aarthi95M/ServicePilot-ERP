// ============================================================
// lib/store/auth.ts
//
// WHAT THIS FILE IS:
// Global state store for the logged-in user.
// Stores: JWT token, user info, role.
// Persists to localStorage so page refresh doesn't log you out.
//
// .NET EQUIVALENT:
// Like HttpContext.Session or ClaimsPrincipal — but client-side.
// Every component that needs to know "who is logged in" reads
// from this store instead of decoding the JWT themselves.
//
// HOW ZUSTAND WORKS:
// Zustand is a state manager. Think of it like a singleton
// service in .NET that any component can inject and read from.
//
// In .NET:
//   services.AddSingleton<ICurrentUserService, CurrentUserService>();
//   // Then inject anywhere: ICurrentUserService _currentUser
//
// In React with Zustand:
//   const user = useAuthStore(s => s.user);
//   // Works in ANY component — no prop drilling needed
//
// WHY PERSIST TO LOCALSTORAGE:
// Without persistence, refreshing the page clears Zustand state
// and the user gets logged out. The persist middleware
// automatically saves to localStorage and rehydrates on startup.
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser, UserRole } from '@/lib/types';

// ── Custom storage: uses sessionStorage OR localStorage based on
//    the sp-remember flag set at login time.
//    sessionStorage → cleared when the browser tab/window closes
//    localStorage   → persists across restarts (Remember me = ON)
const smartStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    // prefer sessionStorage; fall back to localStorage
    return (
      sessionStorage.getItem(name) ??
      localStorage.getItem(name)
    );
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    const remember = localStorage.getItem('sp-remember') === 'true';
    if (remember) {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name); // avoid stale session copy
    } else {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);   // clear any old "remembered" data
    }
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
}));

// ── State interface ──────────────────────────────────────────
// Defines the shape of what the store holds.
// .NET equivalent: the fields on ICurrentUserService

interface AuthState {
  // The logged-in user — null if not logged in
  user: AuthUser | null;

  // Convenience getters — mirrors your ICurrentUserService methods
  isAuthenticated: boolean;
  token: string | null;

  // Actions — methods that update the state
  // .NET equivalent: methods on the service

  // Called after successful login with the data from the API response.
  // Pass remember=true to persist across browser restarts (localStorage),
  // or remember=false for session-only (sessionStorage, cleared on close).
  login: (user: AuthUser, remember?: boolean) => void;

  // Called on logout or 401 response
  logout: () => void;

  // Role check helpers — mirrors your IAuthService.IsAdmin() etc.
  // Usage: const isAdmin = useAuthStore(s => s.hasRole('Admin'))
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

// ── Create the store ─────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  // persist() wraps the store and automatically saves to localStorage
  // Key 'sp-auth' is what it saves under in localStorage
  persist(
    (set, get) => ({
      // Initial state — not logged in
      user: null,
      isAuthenticated: false,
      token:null,
      // Login action
      // Called by the login page after a successful API response.
      // remember=true  → localStorage  (survives browser restart)
      // remember=false → sessionStorage (cleared when browser closes)
      login: (user: AuthUser, remember = false) => {
        // Write the remember flag BEFORE Zustand's persist fires so
        // smartStorage above picks the right storage bucket.
        localStorage.setItem('sp-remember', String(remember));

        // Save token under both keys the Axios interceptor looks for.
        // Use the correct storage depending on remember preference.
        const tokenStorage = remember ? localStorage : sessionStorage;
        tokenStorage.setItem('sp-token', user.token);
        // Remove from the other storage to avoid stale tokens.
        if (remember) sessionStorage.removeItem('sp-token');
        else           localStorage.removeItem('sp-token');

        set({ user, token: user.token, isAuthenticated: true });
      },

      // Logout action — wipe BOTH storages to be safe
      logout: () => {
        localStorage.removeItem('sp-token');
        localStorage.removeItem('sp-remember');
        sessionStorage.removeItem('sp-token');

        set({ user: null, token: null, isAuthenticated: false });
      },

      // Role check helper
      // Usage: hasRole('Admin') or hasRole(['Admin', 'HRManager'])
      //
      // .NET equivalent:
      // User.IsInRole("Admin") or checking ClaimsPrincipal
      hasRole: (role: UserRole | UserRole[]) => {
        const currentUser = get().user;
        if (!currentUser) return false;

        if (Array.isArray(role)) {
          // Check if user's role is in the array
          return role.includes(currentUser.role);
        }

        return currentUser.role === role;
      },
    }),
    {
      name: 'sp-auth',            // storage key name
      storage: smartStorage,      // sessionStorage OR localStorage per remember flag
      partialize: (state) => ({   // only persist data, not functions
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ── Convenience hooks ────────────────────────────────────────
// These make components cleaner — instead of:
//   const user = useAuthStore(s => s.user)
// You write:
//   const user = useCurrentUser()

export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useUserRole = () => useAuthStore((s) => s.user?.role);
