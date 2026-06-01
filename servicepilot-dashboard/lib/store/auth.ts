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
import { persist } from 'zustand/middleware'; // saves state to localStorage
import type { AuthUser, UserRole } from '@/lib/types';

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

  // Called after successful login with the data from the API response
  login: (user: AuthUser) => void;

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
      // Called by the login page after a successful API response
      login: (user: AuthUser) => {
        // Save token separately so the Axios interceptor can read it
        // (interceptors run outside React so can't use the Zustand hook)
        localStorage.setItem('sp-token', user.token);

        // Update the store — this triggers a re-render in all
        // components that use useAuthStore()
        set({ user, token: user.token, isAuthenticated: true });
      },

      // Logout action
      logout: () => {
        // Clear localStorage
        localStorage.removeItem('sp-token');

        // Clear the store — triggers re-render everywhere
        set({ user: null,token:null, isAuthenticated: false });
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
      name: 'sp-auth', // localStorage key
      // Only persist user and isAuthenticated — not the functions
      partialize: (state) => ({
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
