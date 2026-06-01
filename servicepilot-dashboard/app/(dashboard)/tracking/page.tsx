'use client';
// app/(dashboard)/tracking/page.tsx
// Live tracking — shows last known location + attendance status for every employee.
// Polls the backend every 30 s. Real Leaflet map via react-leaflet.

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { LeafletMap } from '@/components/shared/LeafletMap';
import type { MapMarker } from '@/components/shared/LeafletMap';

interface LiveEmployee {
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  phoneNumber?: string;
  branchName?: string;
  latitude?: number | null;
  longitude?: number | null;
  lastSeenAt?: string | null;
  attendanceStatus: 'CheckedIn' | 'CheckedOut' | 'NotCheckedIn';
}

function useLiveLocations() {
  return useQuery<LiveEmployee[]>({
    queryKey: ['live-locations'],
    queryFn: async () => {
      const r = await apiClient.get('/attendance/live-locations');
      return r.data.data ?? [];
    },
    refetchInterval: 30_000,   // auto-refresh every 30 s
    staleTime: 25_000,
  });
}

const STATUS_CFG = {
  CheckedIn:    { cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  label: 'Checked In'     },
  CheckedOut:   { cls: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',   label: 'Checked Out'    },
  NotCheckedIn: { cls: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400',  label: 'Not Checked In' },
};

export default function LiveTrackingPage() {
  const qc = useQueryClient();
  const { data: employees = [], isLoading, dataUpdatedAt } = useLiveLocations();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = employees.filter(e => {
    const matchName = e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
                      (e.employeeCode ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.attendanceStatus === statusFilter;
    return matchName && matchStatus;
  });

  const counts = {
    total:      employees.length,
    checkedIn:  employees.filter(e => e.attendanceStatus === 'CheckedIn').length,
    checkedOut: employees.filter(e => e.attendanceStatus === 'CheckedOut').length,
    absent:     employees.filter(e => e.attendanceStatus === 'NotCheckedIn').length,
  };

  const lastRefresh = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  // Build Leaflet markers from employees with GPS coordinates
  const mapMarkers: MapMarker[] = filtered
    .filter(e => e.latitude && e.longitude)
    .map(e => ({
      lat:   e.latitude!,
      lng:   e.longitude!,
      label: e.employeeName,
      color: e.attendanceStatus === 'CheckedIn'  ? 'green'
           : e.attendanceStatus === 'CheckedOut' ? 'gray'
           : 'amber',
      popup: `${e.employeeName} · ${STATUS_CFG[e.attendanceStatus]?.label ?? e.attendanceStatus}`,
    }));

  // Centre on first employee with GPS, fallback to Dubai
  const mapCenter: [number, number] = mapMarkers.length > 0
    ? [mapMarkers[0].lat, mapMarkers[0].lng]
    : [25.2048, 55.2708];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Live Tracking</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Real-time employee locations · auto-refreshes every 30 s · last updated {lastRefresh}
          </p>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['live-locations'] })}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-7.42"/></svg>
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-4 gap-3.5">
        {[
          { label: 'Total Employees',  value: counts.total,      color: 'text-gray-900',   bg: 'bg-white' },
          { label: 'Checked In',       value: counts.checkedIn,  color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Checked Out',      value: counts.checkedOut, color: 'text-gray-600',   bg: 'bg-gray-50' },
          { label: 'Not Checked In',   value: counts.absent,     color: 'text-amber-600',  bg: 'bg-amber-50' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border border-gray-200 ${card.bg} p-5 shadow-sm`}>
            <div className="text-[12px] text-gray-500 mb-1">{card.label}</div>
            <div className={`text-[28px] font-bold tabular-nums ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Live map — OpenStreetMap via react-leaflet */}
      <div className="mb-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3.5 flex items-center justify-between">
          <div className="text-[13px] font-semibold text-gray-900">Location Map</div>
          <span className="text-[12px] text-gray-400">
            {mapMarkers.length} employee{mapMarkers.length !== 1 ? 's' : ''} with GPS
          </span>
        </div>
        {mapMarkers.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center bg-[#e8f0f7]">
            <p className="text-[13px] text-gray-400">
              No GPS coordinates available — employees need to check in via the mobile app
            </p>
          </div>
        ) : (
          <LeafletMap
            center={mapCenter}
            zoom={12}
            markers={mapMarkers}
            height="280px"
          />
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <div className="flex h-9 flex-1 max-w-xs items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee..."
            className="flex-1 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600">
          <option value="all">All Statuses</option>
          <option value="CheckedIn">Checked In</option>
          <option value="CheckedOut">Checked Out</option>
          <option value="NotCheckedIn">Not Checked In</option>
        </select>
      </div>

      {/* Employee table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading && (
          <div className="divide-y divide-gray-50">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse"/>
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-36 rounded bg-gray-100 animate-pulse"/>
                  <div className="h-3 w-24 rounded bg-gray-100 animate-pulse"/>
                </div>
                <div className="h-6 w-24 rounded-full bg-gray-100 animate-pulse"/>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center text-[13px] text-gray-400">No employees found</div>
        )}

        {!isLoading && filtered.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Employee', 'Branch', 'Status', 'Coordinates', 'Last Seen'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(emp => {
                const cfg = STATUS_CFG[emp.attendanceStatus] ?? STATUS_CFG.NotCheckedIn;
                const colors = ['#0d9488','#2563eb','#7c3aed','#d97706','#dc2626'];
                const avatarColor = colors[(emp.employeeName?.length ?? 0) % colors.length];
                const initials = (emp.employeeName ?? '').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '??';

                return (
                  <tr key={emp.employeeId} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ background: avatarColor }}>{initials}</div>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`}/>
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-gray-900">{emp.employeeName}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{emp.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-600">{emp.branchName || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {emp.latitude && emp.longitude ? (
                        <span className="font-mono text-[11px] text-gray-500">
                          {Number(emp.latitude).toFixed(5)}, {Number(emp.longitude).toFixed(5)}
                        </span>
                      ) : (
                        <span className="text-[12px] text-gray-400">No GPS data</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-500">
                      {emp.lastSeenAt
                        ? new Date(emp.lastSeenAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
