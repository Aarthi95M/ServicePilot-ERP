'use client';
// ============================================================
// app/(dashboard)/layout.tsx
//
// WHAT THIS FILE IS:
// The shell that wraps ALL dashboard pages — sidebar + header.
// Every page inside (dashboard)/ automatically gets this layout.
//
// .NET EQUIVALENT:
// Like _Layout.cshtml in MVC — the outer frame every page shares.
// The {children} prop = @RenderBody() in Razor.
//
// WHY 'use client':
// We need useState to track which nav item is active and to
// handle the mobile sidebar toggle. These are browser-only.
//
// HOW NEXT.JS LAYOUTS WORK:
// app/(dashboard)/layout.tsx    wraps all (dashboard) pages
// app/layout.tsx                wraps the ENTIRE app (root)
// Layouts nest — root layout → dashboard layout → page
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth';
import apiClient from '@/lib/api/client';
import { SessionGuard } from '@/components/shared/SessionGuard';

// ── Navigation items ─────────────────────────────────────────
// Each item carries a `roles` array — only roles listed can see it.
// An empty `roles` array means "all authenticated roles".
//
// Role matrix:
//  Admin        — full access to everything
//  HRManager    — Employees, Attendance, Leave, Overtime, Reports (NO Jobs/Tracking/Users)
//  Supervisor   — Employees, Jobs, Attendance, Leave, Overtime, Live Tracking
//  Dispatcher   — Jobs only (NO attendance, HR, tracking)
//  Technician   — mobile-only; if they land on web they see Dashboard only
//
// .NET equivalent: checking User.IsInRole() before rendering <li>

type NavItem = {
  label: string;
  href: string;
  icon: () => React.ReactElement;
  roles: string[];  // empty = all roles
};

type NavGroup = {
  section: string;
  items: NavItem[];
};

const NAV_ITEMS: NavGroup[] = [
  {
    section: 'Main',
    items: [
      {
        label: 'Dashboard', href: '/dashboard', icon: IconGrid,
        roles: [], // everyone
      },
      {
        label: 'Employees', href: '/employees', icon: IconUsers,
        roles: ['Admin', 'HRManager', 'Supervisor'],
      },
      {
        label: 'Attendance', href: '/attendance', icon: IconClock,
        roles: ['Admin', 'HRManager', 'Supervisor'],
      },
      {
        label: 'Jobs', href: '/jobs', icon: IconBriefcase,
        roles: ['Admin', 'Supervisor', 'Dispatcher'],  // HRManager excluded
      },
    ],
  },
  {
    section: 'HR',
    items: [
      {
        label: 'Leave Requests', href: '/leave', icon: IconFile,
        roles: ['Admin', 'HRManager', 'Supervisor'],
      },
      {
        label: 'Overtime', href: '/overtime', icon: IconTrend,
        roles: ['Admin', 'HRManager', 'Supervisor'],
      },
    ],
  },
  {
    section: 'Operations',
    items: [
      {
        label: 'Live Tracking', href: '/tracking', icon: IconMapPin,
        roles: ['Admin', 'Supervisor'],  // Dispatcher & HR don't need live tracking
      },
      {
        label: 'Reports', href: '/reports', icon: IconChart,
        roles: ['Admin', 'HRManager'],
      },
    ],
  },
  {
    section: 'Admin',
    items: [
      {
        label: 'Notifications', href: '/notifications', icon: IconBell,
        roles: [], // everyone
      },
      {
        label: 'Users', href: '/users', icon: IconUserCog,
        roles: ['Admin'],
      },
      {
        label: 'Settings', href: '/settings', icon: IconSettings,
        roles: ['Admin'],
      },
      {
        label: 'SuperAdmin', href: '/admin', icon: IconShield,
        roles: ['Admin'],
      },
    ],
  },
];

// ── Layout component ─────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // usePathname() returns the current URL path e.g. '/dashboard', '/employees'
  // We use it to highlight the active nav item
  // .NET equivalent: Request.Path or RouteData.Values["action"]
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // Notification bell badge — real unread count polled every 60 s
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['notifications-unread'],
    queryFn: async () => (await apiClient.get('/notifications/unread-count')).data.data ?? 0,
    staleTime: 55_000,
    refetchInterval: 60_000,
  });

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close the user menu when clicking outside of it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    // Clear Zustand store + localStorage
    logout();
    // Clear the auth cookie so middleware redirects to login
    document.cookie = 'sp-token=; path=/; max-age=0';
    router.push('/login');
  };

  // User initials for the avatar — e.g. "Ahmed Mohammed" → "AM"
  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'SP';

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── SIDEBAR ── */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col border-r border-white/10" style={{ background: '#0D1F5C' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-white/15 px-4 py-5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/20">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">ServicePilot</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {NAV_ITEMS.map((group) => {
            // Filter items the current user's role is allowed to see.
            // roles: [] means visible to everyone (no restriction).
            const visibleItems = group.items.filter(
              item => item.roles.length === 0 || (user?.role && item.roles.includes(user.role))
            );

            // Don't render an empty section header
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.section}>
                {/* Section label */}
                <div className="px-2 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-200/60">
                  {group.section}
                </div>

                {visibleItems.map((item) => {
                  // isActive: true if current URL matches this nav item's href
                  // pathname === item.href handles exact match
                  // pathname.startsWith handles nested routes like /employees/123
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        'mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'text-blue-100/70 hover:bg-white/10 hover:text-white',
                      ].join(' ')}
                      style={isActive ? { borderLeft: '2px solid rgba(255,255,255,0.8)', borderRadius: '0 8px 8px 0', paddingLeft: '9px' } : {}}
                    >
                      <span className={['flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center', isActive ? 'opacity-100' : 'opacity-70'].join(' ')}>
                        <Icon />
                      </span>
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User profile at bottom */}
        <div className="border-t border-white/15 p-2.5">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/10"
          >
            {/* Avatar with initials */}
            <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="flex-1 text-left">
              <div className="text-[12.5px] font-medium leading-tight text-white truncate">
                {user?.email || 'User'}
              </div>
              <div className="text-[11px] text-blue-200/70">{user?.role}</div>
            </div>
            {/* Logout icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA: header + page content ── */}
      <div className="ml-[232px] flex flex-1 flex-col">

        {/* HEADER */}
        <header className="sticky top-0 z-40 flex h-[60px] items-center gap-3 border-b border-[#16307A] px-6" style={{ background: '#0D1F5C' }}>

          {/* Page breadcrumb / title area — push user menu to the right */}
          <div className="flex-1"/>

          {/* Notification bell — links to /notifications with live unread count */}
          <Link href="/notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(prev => !prev)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/10"
            >
              <div className="text-right">
                <div className="text-[13px] font-semibold leading-tight text-white">{user?.email}</div>
                <div className="text-[11px] text-white/60">{user?.role}</div>
              </div>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ backgroundColor: '#16307A' }}>
                {initials}
              </div>
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"
                className={`flex-shrink-0 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Dropdown panel */}
            {userMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-64 rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-200/80 z-50">
                {/* User info header */}
                <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ backgroundColor: '#16307A' }}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-gray-900">{user?.email}</div>
                    <div className="mt-0.5 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                      {user?.role}
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-1.5">
                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M21 12h-3M6 12H3M12 21v-3M12 6V3"/>
                    </svg>
                    Settings
                  </Link>

                  <div className="my-1 border-t border-gray-100"/>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-600 transition-colors hover:bg-red-50"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

        </header>

        {/* Session expiry warning — shows 5 min before JWT expires */}
        <SessionGuard />

        {/* PAGE CONTENT — this is where each page renders */}
        {/* children = the current page component */}
        {/* .NET equivalent: @RenderBody() */}
        <main className="flex-1 p-6">
          {children}
        </main>

      </div>
    </div>
  );
}

// ── SVG Icon components ───────────────────────────────────────
// Each is a tiny component that returns a single SVG.
// Using components instead of inline SVG keeps the nav items clean.
// In a real project: import { LayoutGrid } from 'lucide-react'
// We inline them here to avoid any import issues.

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function IconTrend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

function IconUserCog() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M21 12h-3M6 12H3M12 21v-3M12 6V3"/>
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
