'use client';
// app/(dashboard)/reports/page.tsx
// Reports hub — 4 report tabs: Attendance, Jobs, Leave, Expiry

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

// ── Report API calls ──────────────────────────────────────────
function useAttendanceReport(params: Record<string, any>, enabled: boolean) {
  return useQuery({
    queryKey: ['report-attendance', params],
    queryFn: async () => { const r = await apiClient.get('/reports/attendance', { params }); return r.data.data; },
    enabled: enabled && !!params.from && !!params.to,
    staleTime: 5 * 60 * 1000,
  });
}

function useJobReport(params: Record<string, any>, enabled: boolean) {
  return useQuery({
    queryKey: ['report-jobs', params],
    queryFn: async () => { const r = await apiClient.get('/reports/jobs', { params }); return r.data.data; },
    enabled: enabled && !!params.from && !!params.to,
    staleTime: 5 * 60 * 1000,
  });
}

function useLeaveReport(params: Record<string, any>, enabled: boolean) {
  return useQuery({
    queryKey: ['report-leave', params],
    queryFn: async () => { const r = await apiClient.get('/reports/leave', { params }); return r.data.data; },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

function useExpiryReport(days: number, enabled: boolean) {
  return useQuery({
    queryKey: ['report-expiry', days],
    queryFn: async () => { const r = await apiClient.get('/reports/expiry', { params: { days } }); return r.data.data; },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

const TABS = [
  { id: 'attendance', label: 'Attendance',   icon: '🕐' },
  { id: 'jobs',       label: 'Jobs',         icon: '💼' },
  { id: 'leave',      label: 'Leave',        icon: '📋' },
  { id: 'expiry',     label: 'Doc Expiry',   icon: '🪪' },
] as const;

type Tab = typeof TABS[number]['id'];

// Default date range:
//   Job / Attendance default: 1 Jan of current year → today (shows all year's data on open)
const today = new Date().toISOString().slice(0, 10);
const firstOfYear  = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

function exportCsv(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('attendance');
  // Attendance: current-month default (daily data — keeps rows manageable)
  // Jobs: full-year default so existing jobs are visible immediately
  const [atParams, setAtParams] = useState({ from: firstOfMonth, to: today });
  const [jobParams, setJobParams] = useState({ from: firstOfYear,  to: today });
  const [leaveYear, setLeaveYear] = useState(new Date().getFullYear());
  const [expiryDays, setExpiryDays] = useState(30);

  const attReport  = useAttendanceReport(atParams,  tab === 'attendance');
  const jobReport  = useJobReport(jobParams,         tab === 'jobs');
  const leaveReport= useLeaveReport({ year: leaveYear }, tab === 'leave');
  const expiryReport = useExpiryReport(expiryDays,  tab === 'expiry');

  function handleExport() {
    if (tab === 'attendance' && attReport.data?.rows?.length) {
      const rows = [['Employee','Branch','Present Days','Late Days','Absent Days','Total Hours','Avg Check-in'],
        ...attReport.data.rows.map((r: any) => [r.employeeName, r.branchName, r.presentDays, r.lateDays, r.absentDays, r.totalHours?.toFixed(1), r.averageCheckInTime ?? ''])];
      exportCsv(`attendance-${atParams.from}-to-${atParams.to}.csv`, rows);
    } else if (tab === 'jobs' && jobReport.data?.jobs?.length) {
      const rows = [['Job Number','Customer','Type','Status','Assigned To','Priority','Scheduled','Completed'],
        ...jobReport.data.jobs.map((r: any) => [r.jobNumber, r.customerName, r.jobTypeName ?? '', r.statusName ?? '', r.assignedEmployeeName ?? '', r.priorityLabel, r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString('en-GB') : '', r.completedAt ? new Date(r.completedAt).toLocaleDateString('en-GB') : ''])];
      exportCsv(`jobs-${jobParams.from}-to-${jobParams.to}.csv`, rows);
    } else if (tab === 'leave' && leaveReport.data?.length) {
      const rows = [['Employee','Leave Type','Start','End','Days','Status'],
        ...leaveReport.data.map((r: any) => [r.employeeName, r.leaveTypeName, r.startDate, r.endDate, r.totalDays, r.status])];
      exportCsv(`leave-${leaveYear}.csv`, rows);
    } else if (tab === 'expiry' && expiryReport.data?.length) {
      const rows = [['Employee','Code','Branch','Phone','Document','Expiry Date','Days Left'],
        ...expiryReport.data.flatMap((e: any) => {
          const out: string[][] = [];
          if (e.visa)       out.push([e.fullName, e.employeeCode, e.branchName ?? '', e.phoneNumber ?? '', 'Visa',       e.visa.expiryDate,       e.visa.daysLeft]);
          if (e.passport)   out.push([e.fullName, e.employeeCode, e.branchName ?? '', e.phoneNumber ?? '', 'Passport',   e.passport.expiryDate,   e.passport.daysLeft]);
          if (e.emiratesId) out.push([e.fullName, e.employeeCode, e.branchName ?? '', e.phoneNumber ?? '', 'Emirates ID',e.emiratesId.expiryDate, e.emiratesId.daysLeft]);
          return out;
        })];
      exportCsv(`expiry-within-${expiryDays}-days.csv`, rows);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Analytics &amp; Reports</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">Performance insights and workforce analytics</p>
        </div>
        <button onClick={handleExport} className="flex h-9 items-center gap-1.5 rounded-lg bg-btn px-4 text-[13px] font-semibold text-white hover:bg-btn-hover transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>

      {/* Tab bar — matches your Figma: Overview | Attendance | Productivity | Jobs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-medium transition-colors ${tab === t.id ? 'bg-btn text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ATTENDANCE REPORT ── */}
      {tab === 'attendance' && (
        <div>
          {/* Summary metric cards — like your Figma */}
          {attReport.data && (
            <div className="mb-5 grid grid-cols-4 gap-3.5">
              {[
                { label: 'Avg Attendance', value: `${(attReport.data.rows?.length ?? 0) > 0 ? Math.round((attReport.data.rows ?? []).reduce((a: number, r: any) => a + ((r.presentDays ?? 0) / (attReport.data.totalDays || 1) * 100), 0) / attReport.data.rows.length) : 0}%`, trend: '↑', cls: 'text-green-600' },
                { label: 'Total Days',     value: attReport.data.totalDays ?? 0, trend: null,  cls: 'text-gray-900' },
                { label: 'Employees',      value: attReport.data.rows?.length ?? 0, trend: null,  cls: 'text-gray-900' },
                { label: 'Avg Hours/Day',  value: `${(attReport.data.rows?.length ?? 0) > 0 ? ((attReport.data.rows ?? []).reduce((a: number, r: any) => a + (r.averageHoursPerDay ?? 0), 0) / attReport.data.rows.length).toFixed(1) : 0}h`, trend: null, cls: 'text-gray-900' },
              ].map(card => (
                <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-1 text-[12px] text-gray-500">{card.label}</div>
                  <div className={`text-[28px] font-bold tabular-nums tracking-tight ${card.cls}`}>
                    {card.trend && <span className="mr-1 text-[16px]">{card.trend}</span>}
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Date filters */}
          <div className="mb-4 flex items-center gap-3">
            <input type="date" value={atParams.from} onChange={e => setAtParams(p => ({ ...p, from: e.target.value }))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600"/>
            <span className="text-[13px] text-gray-400">to</span>
            <input type="date" value={atParams.to} onChange={e => setAtParams(p => ({ ...p, to: e.target.value }))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600"/>
            {attReport.isFetching && <Spinner />}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {attReport.isLoading && <TableSkeleton cols={7} rows={6} />}
            {attReport.data && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Employee','Branch','Present','Late','Absent','Total Hours','Avg Check-in'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(attReport.data.rows || []).map((row: any) => (
                    <tr key={row.employeeId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="text-[13px] font-medium text-gray-900">{row.employeeName}</div>
                        <div className="text-[11px] font-mono text-gray-400">{row.employeeCode}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-700">{row.branchName || '—'}</td>
                      <td className="px-5 py-3.5"><span className="font-medium text-green-700">{row.presentDays}</span></td>
                      <td className="px-5 py-3.5"><span className="font-medium text-amber-600">{row.lateDays}</span></td>
                      <td className="px-5 py-3.5"><span className="font-medium text-red-600">{row.absentDays}</span></td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-700 tabular-nums">{row.totalHoursWorked?.toFixed(1)}h</td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-700">{row.averageCheckIn || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!attReport.isLoading && !attReport.data && (
              <div className="py-12 text-center text-[13px] text-gray-400">Select a date range to generate the report</div>
            )}
          </div>
        </div>
      )}

      {/* ── JOB REPORT ── */}
      {tab === 'jobs' && (
        <div>
          {jobReport.data && (
            <div className="mb-5 grid grid-cols-4 gap-3.5">
              {[
                { label: 'Total Jobs',      value: jobReport.data.totalJobs,     cls: 'text-gray-900' },
                { label: 'Completed',       value: jobReport.data.completedJobs, cls: 'text-green-600' },
                { label: 'Active',          value: jobReport.data.activeJobs,    cls: 'text-blue-600'  },
                { label: 'Completion Rate', value: `${jobReport.data.completionRate}%`, cls: 'text-green-600' },
              ].map(card => (
                <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-1 text-[12px] text-gray-500">{card.label}</div>
                  <div className={`text-[28px] font-bold tabular-nums tracking-tight ${card.cls}`}>{card.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mb-4 flex items-center gap-3">
            <input type="date" value={jobParams.from} onChange={e => setJobParams(p => ({ ...p, from: e.target.value }))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600"/>
            <span className="text-[13px] text-gray-400">to</span>
            <input type="date" value={jobParams.to} onChange={e => setJobParams(p => ({ ...p, to: e.target.value }))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600"/>
            {jobReport.isFetching && <Spinner />}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {jobReport.isLoading && <TableSkeleton cols={7} rows={5} />}
            {jobReport.data && (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {['Job #','Customer','Type','Status','Assigned To','Scheduled','Priority'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(jobReport.data.jobs || []).map((row: any) => (
                      <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[13px] font-semibold text-blue-700">{row.jobNumber}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-[13px] font-medium text-gray-900">{row.customerName}</div>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-500">{row.jobTypeName || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                            style={{
                              backgroundColor: row.statusColor ? `${row.statusColor}22` : '#f1f5f9',
                              color: row.statusColor ?? '#475569',
                            }}>
                            {row.statusName || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-700">
                          {row.assignedEmployeeName
                            ? <><div>{row.assignedEmployeeName}</div><div className="text-[11px] font-mono text-gray-400">{row.assignedEmployeeCode}</div></>
                            : <span className="text-gray-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-500">
                          {row.scheduledAt ? new Date(row.scheduledAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[12px] font-medium ${
                            row.priorityLabel === 'Critical' ? 'text-red-600' :
                            row.priorityLabel === 'High' ? 'text-orange-600' :
                            row.priorityLabel === 'Medium' ? 'text-amber-600' : 'text-gray-500'
                          }`}>{row.priorityLabel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!jobReport.data.jobs || jobReport.data.jobs.length === 0) && (
                  <div className="py-12 text-center text-[13px] text-gray-400">
                    No jobs found in this date range — try widening the range
                  </div>
                )}
              </>
            )}
            {!jobReport.isLoading && !jobReport.data && (
              <div className="py-12 text-center text-[13px] text-gray-400">Select a date range to generate the report</div>
            )}
          </div>
        </div>
      )}

      {/* ── LEAVE REPORT ── */}
      {tab === 'leave' && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <select value={leaveYear} onChange={e => setLeaveYear(Number(e.target.value))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {leaveReport.isFetching && <Spinner />}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {leaveReport.isLoading && <TableSkeleton cols={7} rows={5} />}
            {leaveReport.data && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Employee','Department','Leave Days','Pending Leave','OT Hours','Pending OT','Rejections'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(leaveReport.data.rows || []).map((row: any) => (
                    <tr key={row.employeeId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="text-[13px] font-medium text-gray-900">{row.employeeName}</div>
                        <div className="text-[11px] font-mono text-gray-400">{row.employeeCode}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-700">{row.departmentName || '—'}</td>
                      <td className="px-5 py-3.5 font-medium text-green-700 tabular-nums">{row.approvedLeaveDays}</td>
                      <td className="px-5 py-3.5 text-amber-600 tabular-nums">{row.pendingLeaveDays}</td>
                      <td className="px-5 py-3.5 font-medium text-blue-700 tabular-nums">{row.approvedOvertimeHours}h</td>
                      <td className="px-5 py-3.5 text-amber-600 tabular-nums">{row.pendingOvertimeHours}h</td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-500 tabular-nums">{row.rejectedLeaveCount + row.rejectedOvertimeCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── EXPIRY REPORT ── */}
      {tab === 'expiry' && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <select value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600">
              <option value={30}>Expiring in 30 days</option>
              <option value={60}>Expiring in 60 days</option>
              <option value={90}>Expiring in 90 days</option>
              <option value={365}>Expiring in 1 year</option>
            </select>
            {expiryReport.isFetching && <Spinner />}
            {expiryReport.data && (
              <span className="text-[13px] font-medium text-red-600">
                {expiryReport.data.totalAffected} employee{expiryReport.data.totalAffected !== 1 ? 's' : ''} affected
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {expiryReport.isLoading && <TableSkeleton cols={6} rows={4} />}
            {expiryReport.data && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Employee','Branch','Phone','Visa','Passport','Emirates ID'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(expiryReport.data.rows || []).map((row: any) => (
                    <tr key={row.employeeId} className={`transition-colors hover:bg-gray-50/50 ${row.hasExpired ? 'bg-red-50/30' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="text-[13px] font-medium text-gray-900">{row.employeeName}</div>
                        <div className="text-[11px] font-mono text-gray-400">{row.employeeCode}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-700">{row.branchName || '—'}</td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-700">{row.phoneNumber || '—'}</td>
                      <td className="px-5 py-3.5"><ExpiryCell days={row.visaDaysLeft} date={row.visaExpiryDate} /></td>
                      <td className="px-5 py-3.5"><ExpiryCell days={row.passportDaysLeft} date={row.passportExpiryDate} /></td>
                      <td className="px-5 py-3.5"><ExpiryCell days={row.emiratesIdDaysLeft} date={row.emiratesIdExpiryDate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!expiryReport.isLoading && expiryReport.data?.rows?.length === 0 && (
              <div className="py-12 text-center text-[13px] text-green-600">
                ✓ No documents expiring within {expiryDays} days
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExpiryCell({ days, date }: { days: number | null; date: string | null }) {
  if (!date || days === null) return <span className="text-[12px] text-gray-300">—</span>;
  const cls = days < 0 ? 'text-red-700 font-semibold' : days <= 30 ? 'text-amber-700 font-medium' : 'text-gray-700';
  return (
    <div>
      <div className={`text-[12px] ${cls}`}>{date}</div>
      <div className={`text-[11px] ${days < 0 ? 'text-red-500' : 'text-gray-400'}`}>
        {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

function TableSkeleton({ cols, rows }: { cols: number; rows: number }) {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-3.5 flex-1 rounded bg-gray-100 animate-pulse"/>
          ))}
        </div>
      ))}
    </div>
  );
}
