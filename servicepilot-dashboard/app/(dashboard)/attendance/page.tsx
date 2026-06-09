'use client';
// app/(dashboard)/attendance/page.tsx
// Includes: manual attendance adjustment (supervisor / admin)
//           Add manual attendance record for forgotten check-ins
//           Live technician tracking map via React Leaflet

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { SortArrow } from '@/lib/hooks/useTableSort';
import { LeafletMap } from '@/components/shared/LeafletMap';
import type { MapMarker } from '@/components/shared/LeafletMap';

// ─── UTC guard ────────────────────────────────────────────────────────────────
// The backend previously serialised DateTimes without a "Z" suffix due to a
// Npgsql legacy-mode flag.  That flag is now removed, so all timestamps carry
// "Z".  This helper is defence-in-depth for any stale records in the database.
function ensureUtc(iso: string): string {
  if (!iso) return iso;
  return iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z';
}

// ─── Adjust modal ─────────────────────────────────────────────────────────────
// Converts a UTC ISO string to the value format required by <input type="datetime-local">
function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(ensureUtc(iso));
  // datetime-local needs "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Converts datetime-local string back to UTC ISO for the API
function localToUtcIso(local: string): string {
  return new Date(local).toISOString();
}

interface AdjustModalProps {
  record: any;
  onClose: () => void;
  onSaved: () => void;
}

function AdjustModal({ record, onClose, onSaved }: AdjustModalProps) {
  const [checkIn,  setCheckIn]  = useState(isoToLocal(record.checkInTime));
  const [checkOut, setCheckOut] = useState(isoToLocal(record.checkOutTime));
  const [clearOut, setClearOut] = useState(false);  // clear checkout so employee can re-checkout
  const [notes,    setNotes]    = useState('');
  const [error,    setError]    = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        checkInTime:  localToUtcIso(checkIn),
        checkOutTime: clearOut ? null : (checkOut ? localToUtcIso(checkOut) : null),
        notes,
      };
      const res = await apiClient.put(`/attendance/${record.id}/adjust`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success === false) { setError(data.message || 'Adjustment failed.'); return; }
      onSaved();
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Something went wrong.'),
  });

  const handleSave = () => {
    setError('');
    if (!checkIn) { setError('Check-in time is required.'); return; }
    if (!clearOut && checkOut && new Date(checkOut) <= new Date(checkIn)) {
      setError('Check-out must be after check-in.'); return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900">Adjust Attendance Record</h2>
            <p className="mt-0.5 text-[13px] text-gray-500">
              {record.employeeName} &mdash;{' '}
              {record.checkInTime
                ? new Date(ensureUtc(record.checkInTime)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                : 'Unknown date'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gray-600">Check-In Time *</label>
            <input
              type="datetime-local"
              value={checkIn}
              onChange={e => setCheckIn(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[12px] font-semibold text-gray-600">Check-Out Time</label>
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-amber-600 font-medium">
                <input
                  type="checkbox"
                  checked={clearOut}
                  onChange={e => { setClearOut(e.target.checked); if (e.target.checked) setCheckOut(''); }}
                  className="h-3.5 w-3.5 rounded accent-amber-500"
                />
                Clear checkout (employee re-checks out on mobile)
              </label>
            </div>
            <input
              type="datetime-local"
              value={checkOut}
              onChange={e => setCheckOut(e.target.value)}
              disabled={clearOut}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:text-gray-400"
            />
            {clearOut && (
              <p className="mt-1.5 text-[11px] text-amber-600">
                ⚠️ Checkout will be cleared. The employee will need to check out again from their mobile app.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gray-600">Reason / Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Employee forgot to check out, system error, manual correction…"
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={mutation.isPending || !checkIn}
            className="flex-1 rounded-lg bg-btn py-2 text-[13px] font-semibold text-white hover:bg-btn-hover transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add manual record modal ──────────────────────────────────────────────────
interface AddManualRecordModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function AddManualRecordModal({ onClose, onSaved }: AddManualRecordModalProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [checkIn,    setCheckIn]    = useState('');
  const [checkOut,   setCheckOut]   = useState('');
  const [notes,      setNotes]      = useState('');
  const [error,      setError]      = useState('');

  // Load employee lookup — same endpoint & cache key used by Jobs reassign
  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ['employee-lookup'],
    queryFn: async () => {
      const r = await apiClient.get('/lookups/employees');
      return r.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        employeeId,
        checkInTime:  localToUtcIso(checkIn),
        checkOutTime: checkOut ? localToUtcIso(checkOut) : null,
        notes:        notes || null,
      };
      const res = await apiClient.post('/attendance/manual', payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success === false) { setError(data.message || 'Failed to create record.'); return; }
      onSaved();
    },
    onError: (e: any) => setError(e?.message ?? e?.response?.data?.message ?? 'Something went wrong.'),
  });

  const handleSubmit = () => {
    setError('');
    if (!employeeId)  { setError('Please select an employee.'); return; }
    if (!checkIn)     { setError('Check-in time is required.'); return; }
    if (checkOut && new Date(checkOut) <= new Date(checkIn)) {
      setError('Check-out must be after check-in.'); return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900">Add Manual Attendance Record</h2>
            <p className="mt-0.5 text-[13px] text-gray-500">For employees who forgot to check in</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">

          {/* Employee dropdown — matches Jobs reassign style */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gray-600">Employee *</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="">{empLoading ? 'Loading employees…' : 'Select employee…'}</option>
              {(employees as any[]).map((e: any) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>

          {/* Check-In Time */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gray-600">Check-In Time *</label>
            <input
              type="datetime-local"
              value={checkIn}
              onChange={e => setCheckIn(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Check-Out Time */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gray-600">Check-Out Time <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              type="datetime-local"
              value={checkOut}
              onChange={e => setCheckOut(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-gray-600">Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Employee forgot to check in, admin override…"
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending || !employeeId || !checkIn}
            className="flex-1 rounded-lg bg-btn py-2 text-[13px] font-semibold text-white hover:bg-btn-hover transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Create Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Dashboard query — auto-refreshes every 60 seconds (live attendance)
function useAttendanceDashboard() {
  return useQuery({
    queryKey: ['attendance-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/attendance/dashboard');
      return res.data.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// List query — params must match AttendanceFilterDto exactly:
// employeeId, branchId, departmentId, dateFrom, dateTo, status
// Plus pagination: page, pageSize, sortBy, sortDir
function useAttendanceList(params: Record<string, any>) {
  // Build clean params — remove undefined/empty values so they
  // don't get sent as empty strings to the backend
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
  );

  return useQuery({
    queryKey: ['attendance-list', cleanParams],
    queryFn: async () => {
      const res = await apiClient.get('/attendance', { params: cleanParams });
      return res.data.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (prev: any) => prev,
  });
}

// Status options matching your backend AttendanceStatus constants
const STATUS_OPTIONS = [
  { value: '',        label: 'All statuses' },
  { value: 'present', label: 'Present'      },  // ← lowercase
  { value: 'late',    label: 'Late'         },  // ← lowercase
  { value: 'absent',  label: 'Absent'       },  // ← lowercase
];

export default function AttendancePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'dashboard' | 'list'>('dashboard');
  const [adjustRecord,     setAdjustRecord]     = useState<any | null>(null);
  const [showManualModal,  setShowManualModal]   = useState(false);

  // List filter state — each key matches AttendanceFilterDto property names
  const [filters, setFilters] = useState<{
    page: number;
    pageSize: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    employeeId?: string;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }>({
    page: 1,
    pageSize: 20,
    sortBy: 'checkInTime',
    sortDir: 'desc',
  });

  const toggleAttendanceSort = (col: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: col,
      sortDir: prev.sortBy === col && prev.sortDir === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const { data: dashboard, isLoading: dashLoading } = useAttendanceDashboard();
  const { data: list, isLoading: listLoading, isFetching } = useAttendanceList(
    tab === 'list' ? filters : {} // only fetch list when on list tab
  );

  // Update a single filter — resets to page 1
  const setFilter = (key: string, value: string | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const totalPages = list ? Math.ceil(list.totalCount / filters.pageSize) : 0;

  return (
    <div>
      {/* Header with tab switcher */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Attendance</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">Track daily attendance and check-ins</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-btn px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-btn-hover transition-colors shadow-sm"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Manual Record
          </button>
          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            {(['dashboard', 'list'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-[13px] font-medium capitalize transition-colors ${tab === t ? 'bg-btn text-white' : 'text-gray-600 hover:text-gray-800'}`}>
                {t === 'dashboard' ? 'Today' : 'History'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DASHBOARD TAB ── */}
      {tab === 'dashboard' && (
        <div>
          {dashLoading && (
            <div className="mb-4 grid grid-cols-4 gap-3.5">
              {[1,2,3,4].map(i => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="mb-3 h-8 w-8 rounded-lg bg-gray-100 animate-pulse"/>
                  <div className="mb-1.5 h-8 w-16 rounded bg-gray-100 animate-pulse"/>
                  <div className="h-3.5 w-24 rounded bg-gray-100 animate-pulse"/>
                </div>
              ))}
            </div>
          )}

          {dashboard && (
            <>
              {/* Snapshot cards */}
              <div className="mb-4 grid grid-cols-4 gap-3.5">
                {[
                  { label: 'Total Employees', value: dashboard.totalEmployees, cls: 'text-gray-900',   bg: 'bg-gray-100'   },
                  { label: 'Checked In',       value: dashboard.checkedIn,      cls: 'text-green-700', bg: 'bg-green-100'  },
                  { label: 'Late',             value: dashboard.late,           cls: 'text-amber-700', bg: 'bg-amber-100'  },
                  { label: 'Absent',           value: dashboard.absent,         cls: 'text-red-700',   bg: 'bg-red-100'    },
                ].map(card => (
                  <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-60">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div className={`text-[28px] font-bold tabular-nums ${card.cls}`}>{card.value}</div>
                    <div className="text-[12.5px] text-gray-500">{card.label}</div>
                  </div>
                ))}
              </div>

              {/* Active employees + map */}
              <div className="grid grid-cols-2 gap-4">

                {/* Currently checked in */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <span className="text-[14px] font-semibold text-gray-900">Currently Active</span>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-green-600">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"/>
                      {dashboard.checkedIn} on site
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50 px-5 max-h-[360px] overflow-y-auto">
                    {(dashboard.activeEmployees || []).map((emp: any) => {
                      const initials = emp.employeeName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??';
                      return (
                        <div key={emp.employeeId} className="flex items-center gap-3 py-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-gray-900 truncate">{emp.employeeName}</div>
                            <div className="text-[11px] text-gray-400">{emp.employeeCode}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[11px] text-gray-500">
                              {emp.checkInTime ? new Date(ensureUtc(emp.checkInTime)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                            <span className="text-[10px] font-medium text-green-600">On site</span>
                          </div>
                        </div>
                      );
                    })}
                    {(!dashboard.activeEmployees || dashboard.activeEmployees.length === 0) && (
                      <div className="py-8 text-center text-[13px] text-gray-400">No active employees right now</div>
                    )}
                  </div>
                </div>

                {/* Live technician tracking map — React Leaflet */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <span className="text-[14px] font-semibold text-gray-900">Live Technician Map</span>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-green-600">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"/>
                      {(() => {
                        const withGps = (dashboard.activeEmployees || []).filter(
                          (e: any) => e.checkInLat && e.checkInLng
                        ).length;
                        return withGps > 0
                          ? `${withGps} on map`
                          : 'Awaiting GPS';
                      })()}
                    </div>
                  </div>
                  {/* Build markers from active employees who have GPS coordinates.
                      checkInLat / checkInLng come from AttendanceResponseDto.
                      Employees who checked in without GPS (or via offline sync) won't appear. */}
                  {(() => {
                    const markers: MapMarker[] = (dashboard.activeEmployees || [])
                      .filter((emp: any) => emp.checkInLat && emp.checkInLng)
                      .map((emp: any) => ({
                        lat:   Number(emp.checkInLat),
                        lng:   Number(emp.checkInLng),
                        label: emp.employeeName ?? 'Unknown',
                        popup: `${emp.employeeName} — checked in ${
                          emp.checkInTime
                            ? new Date(ensureUtc(emp.checkInTime)).toLocaleTimeString('en-US', {
                                hour: '2-digit', minute: '2-digit',
                              })
                            : ''
                        }`,
                        color: emp.status === 'Late' ? 'amber' : 'green',
                      }));

                    // Center map on the mean position of all visible technicians,
                    // falling back to Dubai city centre if none have GPS yet.
                    const center: [number, number] = markers.length > 0
                      ? [
                          markers.reduce((s, m) => s + m.lat, 0) / markers.length,
                          markers.reduce((s, m) => s + m.lng, 0) / markers.length,
                        ]
                      : [25.2048, 55.2708]; // Dubai

                    return (
                      <LeafletMap
                        center={center}
                        zoom={markers.length > 0 ? 12 : 11}
                        markers={markers}
                        height="360px"
                      />
                    );
                  })()}
                  {/* No-GPS notice */}
                  {(dashboard.activeEmployees || []).filter((e: any) => !e.checkInLat || !e.checkInLng).length > 0 && (
                    <div className="border-t border-gray-100 px-5 py-2.5 text-[11px] text-gray-400">
                      {(dashboard.activeEmployees || []).filter((e: any) => !e.checkInLat || !e.checkInLng).length} employee(s) checked in without GPS — not shown on map
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── LIST / HISTORY TAB ── */}
      {tab === 'list' && (
        <div>
          {/* Filter row */}
          <div className="mb-4 flex flex-wrap items-center gap-3">

            {/* Search */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">Search</label>
              <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-blue-600 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  placeholder="Employee name or code…"
                  className="w-48 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
                  onChange={e => setFilter('search', e.target.value || undefined)}
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">From</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={e => setFilter('dateFrom', e.target.value || undefined)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">To</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={e => setFilter('dateTo', e.target.value || undefined)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Status filter — the key fix:
                We send the exact string your backend expects: "Present" | "Late" | "Absent"
                Empty string → undefined → backend ignores the filter */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">Status</label>
              <select
                value={filters.status || ''}
                onChange={e => setFilter('status', e.target.value || undefined)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600 transition-colors"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {(filters.dateFrom || filters.dateTo || filters.status || filters.search) && (
              <div className="mt-4">
                <button
                  onClick={() => setFilters({ page: 1, pageSize: 20, sortBy: 'checkInTime', sortDir: 'desc' })}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-[12px] text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Clear filters
                </button>
              </div>
            )}

            {/* Fetching indicator */}
            {isFetching && !listLoading && (
              <div className="mt-4 flex items-center gap-1.5 text-[12px] text-gray-400">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Updating...
              </div>
            )}
          </div>

          {/* Active filters summary */}
          {(filters.status || filters.dateFrom || filters.dateTo || filters.search) && (
            <div className="mb-3 flex items-center gap-2 text-[12px] text-gray-500">
              <span>Showing:</span>
              {filters.search && <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">"{filters.search}"</span>}
              {filters.status && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">{filters.status}</span>}
              {filters.dateFrom && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-600">From {filters.dateFrom}</span>}
              {filters.dateTo && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-600">To {filters.dateTo}</span>}
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            {listLoading && (
              <div className="divide-y divide-gray-50">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="h-3.5 w-32 rounded bg-gray-100 animate-pulse"/>
                    <div className="h-3.5 w-20 rounded bg-gray-100 animate-pulse"/>
                    <div className="h-3.5 w-16 rounded bg-gray-100 animate-pulse"/>
                    <div className="h-3.5 w-16 rounded bg-gray-100 animate-pulse"/>
                    <div className="h-3.5 w-12 rounded bg-gray-100 animate-pulse"/>
                    <div className="h-6 w-16 rounded-full bg-gray-100 animate-pulse"/>
                  </div>
                ))}
              </div>
            )}

            {!listLoading && list && (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {[
                        { label: 'Employee',  col: 'employeeName'  },
                        { label: 'Date',      col: 'checkInTime'   },
                        { label: 'Check In',  col: 'checkInTime'   },
                        { label: 'Check Out', col: 'checkOutTime'  },
                        { label: 'Hours',     col: 'hoursWorked'   },
                        { label: 'Status',    col: 'status'        },
                      ].map(({ label, col }) => (
                        <th key={label}
                          onClick={() => toggleAttendanceSort(col)}
                          className={`cursor-pointer select-none px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider transition-colors ${filters.sortBy === col ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                          {label}
                          <SortArrow col={col} sortKey={filters.sortBy || ''} sortDir={filters.sortDir || 'asc'}/>
                        </th>
                      ))}
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Sync</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(list.items || []).map((log: any) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="text-[13px] font-medium text-gray-900">{log.employeeName}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{log.employeeCode}</div>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-700">
                          {log.checkInTime
                            ? new Date(ensureUtc(log.checkInTime)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-700">
                          {log.checkInTime
                            ? new Date(ensureUtc(log.checkInTime)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-700">
                          {log.checkOutTime
                            ? new Date(ensureUtc(log.checkOutTime)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : <span className="text-gray-400 italic">Not yet</span>}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-700 tabular-nums">
                          {log.hoursWorked ? `${Number(log.hoursWorked).toFixed(1)}h` : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            log.status === 'Present' ? 'bg-green-100 text-green-700' :
                            log.status === 'Late'    ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {log.status ? log.status.charAt(0).toUpperCase() + log.status.slice(1) : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {log.isOfflineSync && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-600">Offline</span>
                          )}
                        </td>
                        {/* Adjust button */}
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => setAdjustRecord(log)}
                            className="flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                            title="Manually adjust check-in / check-out times"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Empty state */}
                {list.items?.length === 0 && (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div className="text-[14px] font-medium text-gray-700">No attendance records found</div>
                    <div className="mt-1 text-[13px] text-gray-400">
                      {filters.status ? `No "${filters.status}" records` : 'Try adjusting your filters'}
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {list.totalCount > filters.pageSize && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5">
                    <div className="text-[12px] text-gray-500">
                      Showing {((filters.page - 1) * filters.pageSize) + 1}–{Math.min(filters.page * filters.pageSize, list.totalCount)} of {list.totalCount}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                        disabled={filters.page === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <span className="px-3 text-[13px] text-gray-600">
                        Page {filters.page} of {totalPages}
                      </span>
                      <button onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                        disabled={filters.page >= totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ADJUST MODAL ── */}
      {adjustRecord && (
        <AdjustModal
          record={adjustRecord}
          onClose={() => setAdjustRecord(null)}
          onSaved={() => {
            setAdjustRecord(null);
            qc.invalidateQueries({ queryKey: ['attendance-list'] });
            qc.invalidateQueries({ queryKey: ['attendance-dashboard'] });
          }}
        />
      )}

      {/* ── ADD MANUAL RECORD MODAL ── */}
      {showManualModal && (
        <AddManualRecordModal
          onClose={() => setShowManualModal(false)}
          onSaved={() => {
            setShowManualModal(false);
            qc.invalidateQueries({ queryKey: ['attendance-list'] });
            qc.invalidateQueries({ queryKey: ['attendance-dashboard'] });
          }}
        />
      )}
    </div>
  );
}
