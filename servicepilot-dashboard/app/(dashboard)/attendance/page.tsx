'use client';
// app/(dashboard)/attendance/page.tsx — Fixed version
// Fixes: status filter now works, date filters pass correct format

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { SortArrow } from '@/lib/hooks/useTableSort';

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
  const [tab, setTab] = useState<'dashboard' | 'list'>('dashboard');

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
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {(['dashboard', 'list'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-[13px] font-medium capitalize transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-800'}`}>
              {t === 'dashboard' ? 'Today' : 'History'}
            </button>
          ))}
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
                              {emp.checkInTime ? new Date(emp.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
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

                {/* Map placeholder */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <span className="text-[14px] font-semibold text-gray-900">Live Map</span>
                    <span className="text-[12px] text-gray-400">Phase E · React Leaflet</span>
                  </div>
                  <div className="relative h-[360px] bg-[#e8f0f7]" style={{
                    backgroundImage: 'linear-gradient(rgba(30,60,120,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(30,60,120,0.06) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                  }}>
                    <div className="absolute left-0 right-0 h-px bg-white/80" style={{ top: '35%' }}/>
                    <div className="absolute left-0 right-0 h-px bg-white/80" style={{ top: '65%' }}/>
                    <div className="absolute top-0 bottom-0 w-px bg-white/80" style={{ left: '30%' }}/>
                    <div className="absolute top-0 bottom-0 w-px bg-white/80" style={{ left: '65%' }}/>
                    {(dashboard.activeEmployees || []).slice(0, 5).map((emp: any, i: number) => {
                      const positions = [
                        { top: '25%', left: '28%' }, { top: '48%', left: '55%' },
                        { top: '65%', left: '38%' }, { top: '20%', left: '65%' }, { top: '55%', left: '72%' }
                      ];
                      const colors = ['#0d9488','#2563eb','#7c3aed','#d97706','#dc2626'];
                      const initials = emp.employeeName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??';
                      return (
                        <div key={emp.employeeId} title={emp.employeeName}
                          className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md hover:scale-110 transition-transform"
                          style={{ ...positions[i], background: colors[i] }}>
                          {initials}
                        </div>
                      );
                    })}
                    <div className="absolute bottom-3 right-3 rounded-lg bg-white/80 px-2.5 py-1.5 text-[11px] text-gray-500 shadow-sm backdrop-blur-sm">
                      Install react-leaflet to enable live map
                    </div>
                  </div>
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
                            ? new Date(log.checkInTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-700">
                          {log.checkInTime
                            ? new Date(log.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-700">
                          {log.checkOutTime
                            ? new Date(log.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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
    </div>
  );
}
