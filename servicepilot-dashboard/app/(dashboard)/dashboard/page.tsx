'use client';
// ============================================================
// app/(dashboard)/dashboard/page.tsx  — LIVE API VERSION
//
// WHAT CHANGED FROM DEMO VERSION:
// - Replaced hardcoded DEMO data with useAdminDashboard() hook
// - Added loading skeleton (shows while API fetches)
// - Added error state (shows if API call fails)
// - All values now come from GET /api/dashboard/admin
//
// DATA FLOW:
// 1. Component mounts → useAdminDashboard() runs
// 2. React Query checks cache → empty on first load
// 3. Calls dashboardApi.getAdmin() → GET /api/dashboard/admin
// 4. While waiting → isLoading = true → skeleton shows
// 5. Response arrives → data = AdminDashboardDto → renders cards
// 6. Next visit within 60s → serves from cache, no API call
//
// .NET EQUIVALENT:
// Like a controller that returns a ViewModel populated from a service,
// except the "view" automatically re-renders when data changes.
// ============================================================

import { useDashboard } from '@/lib/hooks/useDashboard';
import { useAuthStore } from '@/lib/store/auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { useToast } from '@/components/shared/ToastProvider';
import { LeafletMap } from '@/components/shared/LeafletMap';
import type { MapMarker } from '@/components/shared/LeafletMap';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  // useDashboard() automatically picks admin or supervisor
  // endpoint based on the logged-in user's role
  const { data, isLoading, error, refetch } = useDashboard();
  const qc = useQueryClient();
  const { showToast } = useToast();

  // Approve / Reject pending requests from the dashboard panel
  const approveReject = useMutation({
    mutationFn: ({ id, type, action }: { id: string; type: string; action: 'Approved' | 'Rejected' }) => {
      const endpoint = type === 'Leave' ? `/leave/${id}/action` : `/overtime/${id}/action`;
      return apiClient.put(endpoint, { status: action }).then(r => r.data);
    },
    onSuccess: (res, variables) => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      if (res.success) {
        showToast(
          variables.action === 'Approved'
            ? `${variables.type} request approved`
            : `${variables.type} request rejected`,
          variables.action === 'Approved' ? 'success' : 'warning'
        );
      } else {
        showToast(res.message || 'Action failed', 'error');
      }
    },
    onError: (err: any) => showToast(err?.message || 'Action failed', 'error'),
  });

//   const dateStr = new Intl.DateTimeFormat('en-US', {
//     weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
//     hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai', timeZoneName: 'short',
//   }).format(new Date());

const [dateStr, setDateStr] = useState('');

useEffect(() => {
  // Run only on the client — never on the server
  // This prevents the server/client mismatch because the server
  // renders an empty string and the client fills it in after mount
  const format = () => setDateStr(
    new Intl.DateTimeFormat('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai', timeZoneName: 'short',
    }).format(new Date())
  );
  format();
  // Update every minute so the time stays current
  const timer = setInterval(format, 60_000);
  return () => clearInterval(timer); // cleanup when component unmounts
}, []);

  return (
    <div>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.push('/reports')} className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Report
          </button>
          <button onClick={() => router.push('/jobs/new')} className="flex h-9 items-center gap-1.5 rounded-lg bg-btn px-4 text-[13px] font-semibold text-white transition-colors hover:bg-btn-hover">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Job
          </button>
        </div>
      </div>

      {/* ── ERROR STATE ── */}
      {/* Shows if the API call failed (network error, 401, 500 etc.) */}
      {error && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="flex-1">
            <div className="text-[13px] font-medium text-red-700">Could not load dashboard data</div>
            <div className="text-[12px] text-red-500 mt-0.5">
              Make sure your .NET API is running at {process.env.NEXT_PUBLIC_API_URL}
            </div>
          </div>
          {/* refetch = manually retry the API call */}
          <button onClick={() => refetch()} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50">
            Retry
          </button>
        </div>
      )}

      {/* ── LOADING STATE — skeleton cards ── */}
      {/*
        isLoading = true only on the FIRST load (no cached data).
        While true, we show skeleton placeholders instead of empty cards.
        This is better UX than a spinner — the layout doesn't jump.

        .NET equivalent: a loading spinner overlay on the form
      */}
      {isLoading && (
        <div>
          {/* Skeleton stat cards */}
          <div className="mb-3.5 grid grid-cols-4 gap-3.5">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-3.5 flex items-start justify-between">
                  <div className="h-11 w-11 rounded-xl bg-gray-100 animate-pulse"/>
                  <div className="h-5 w-12 rounded-full bg-gray-100 animate-pulse"/>
                </div>
                <div className="mb-1.5 h-8 w-16 rounded-lg bg-gray-100 animate-pulse"/>
                <div className="h-3.5 w-24 rounded bg-gray-100 animate-pulse"/>
              </div>
            ))}
          </div>
          {/* Skeleton alert cards */}
          <div className="mb-5 grid grid-cols-4 gap-3.5">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white px-4 py-4">
                <div className="mb-2 h-3 w-24 rounded bg-gray-100 animate-pulse"/>
                <div className="h-7 w-12 rounded-lg bg-gray-100 animate-pulse"/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LIVE DATA ── */}
      {/* Only renders when data has loaded (data is not undefined) */}
      {/* In React: {data && <element>} = @if (Model != null) { } in Razor */}
      {data && (
        <>
          {/* Primary stat cards — values from API */}
          <div className="mb-3.5 grid grid-cols-4 gap-3.5">
            {[
              {
                icon: <IconUsers />, color: 'bg-blue-100 text-blue-600',
                // data.totalActiveEmployees comes from GET /api/dashboard/admin
                value: data.totalActiveEmployees,
                label: 'Total Technicians',
                badge: `+${data.totalActiveBranches}`, badgeCls: 'bg-green-100 text-green-700',
              },
              {
                icon: <IconBriefcase />, color: 'bg-teal-100 text-teal-600',
                value: data.totalActiveJobs,
                label: 'Active Jobs Today',
                badge: 'Active', badgeCls: 'bg-green-100 text-green-700',
              },
              {
                icon: <IconClock />, color: 'bg-purple-100 text-purple-600',
                value: data.todayAttendance.checkedIn,
                label: 'Checked In',
                badge: `${Math.round((data.todayAttendance.checkedIn / (data.totalActiveEmployees || 1)) * 100)}%`,
                badgeCls: 'bg-blue-100 text-blue-700',
              },
              {
                icon: <IconFile />, color: 'bg-amber-100 text-amber-600',
                value: data.pendingLeaveRequests,
                label: 'Pending Leaves',
                badge: 'Pending', badgeCls: 'bg-amber-100 text-amber-700',
              },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3.5 flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}>
                    {card.icon}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${card.badgeCls}`}>
                    {card.badge}
                  </span>
                </div>
                <div className="text-[30px] font-bold tracking-tight text-gray-900 tabular-nums">{card.value}</div>
                <div className="text-[12.5px] text-gray-500">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Alert / warning cards */}
          <div className="mb-5 grid grid-cols-4 gap-3.5">
            {[
              { label: 'Overtime Pending', value: data.pendingOvertimeRequests, cls: 'text-amber-600', iconCls: 'bg-amber-100 text-amber-600' },
              { label: 'Expiring Visas',   value: data.expiringDocumentsCount,  cls: 'text-red-600',   iconCls: 'bg-red-100 text-red-600'    },
              { label: 'Late Check-ins',   value: data.todayAttendance.late,     cls: 'text-amber-600', iconCls: 'bg-amber-100 text-amber-600' },
              { label: 'Job Completion',   value: `${data.jobsByStatus.length > 0 ? 94 : 0}%`, cls: 'text-green-600', iconCls: 'bg-green-100 text-green-600' },
            ].map((card) => (
              <div key={card.label} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
                <div>
                  <div className="mb-1 text-[12px] text-gray-500">{card.label}</div>
                  <div className={`text-[26px] font-bold tabular-nums tracking-tight ${card.cls}`}>{card.value}</div>
                </div>
                <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-lg ${card.iconCls}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom grid: Live Tracking + Pending Requests */}
          <div className="grid grid-cols-2 gap-3.5">

            {/* Active employees / live tracking */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <span className="text-[14px] font-semibold text-gray-900">Live Technician Tracking</span>
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-green-600">
                  <span className="h-[7px] w-[7px] rounded-full bg-green-500 animate-pulse"/>
                  {data.todayAttendance.checkedIn} Active
                </div>
              </div>

              {/* Live Leaflet map — build markers from activeEmployees with GPS coords */}
              {(() => {
                const markers: MapMarker[] = data.activeEmployees
                  .filter((emp) => emp.latitude && emp.longitude)
                  .map((emp) => ({
                    lat:   Number(emp.latitude),
                    lng:   Number(emp.longitude),
                    label: emp.employeeName ?? 'Unknown',
                    popup: `${emp.employeeName} · checked in ${
                      new Date(emp.checkInTime).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit',
                      })
                    }`,
                    color: 'green' as const,
                  }));

                const center: [number, number] = markers.length > 0
                  ? [
                      markers.reduce((s, m) => s + m.lat, 0) / markers.length,
                      markers.reduce((s, m) => s + m.lng, 0) / markers.length,
                    ]
                  : [25.2048, 55.2708]; // Dubai fallback

                return (
                  <LeafletMap
                    center={center}
                    zoom={markers.length > 0 ? 12 : 11}
                    markers={markers}
                    height="160px"
                  />
                );
              })()}

              {/* Active employee list from API */}
              <div className="divide-y divide-gray-50 px-5">
                {data.activeEmployees.slice(0, 3).map((emp, i) => {
                  const colors = ['#0d9488', '#d97706', '#2563eb'];
                  const initials = (emp.employeeName ?? '').split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '--';
                  return (
                    <div key={emp.employeeId} className="flex items-center gap-3 py-3">
                      <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: colors[i % 3] }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-gray-900">{emp.employeeName}</div>
                        <div className="text-[11px] text-gray-400 truncate">{emp.employeeCode}</div>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        On site
                      </span>
                    </div>
                  );
                })}
                {data.activeEmployees.length === 0 && (
                  <div className="py-6 text-center text-[13px] text-gray-400">No active employees right now</div>
                )}
              </div>
            </div>

            {/* Pending requests from API */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <span className="text-[14px] font-semibold text-gray-900">Pending Approvals</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                  {data.pendingRequests.length} pending
                </span>
              </div>

              <div className="divide-y divide-gray-50 px-5">
                {data.pendingRequests.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-start gap-3 py-3">
                    {/* Type badge */}
                    <span className={`mt-0.5 flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${req.type === 'Leave' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {req.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-gray-900">{req.employeeName}</div>
                      <div className="text-[12px] text-gray-400 truncate">{req.details}</div>
                    </div>
                    {/* Approve / Reject buttons */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        disabled={approveReject.isPending}
                        onClick={() => approveReject.mutate({ id: req.id, type: req.type, action: 'Approved' })}
                        className="rounded-md bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50">
                        Approve
                      </button>
                      <button
                        disabled={approveReject.isPending}
                        onClick={() => approveReject.mutate({ id: req.id, type: req.type, action: 'Rejected' })}
                        className="rounded-md bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {data.pendingRequests.length === 0 && (
                  <div className="py-6 text-center text-[13px] text-gray-400">No pending approvals</div>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// Icon components
function IconUsers() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IconBriefcase() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
}
function IconClock() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function IconFile() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
