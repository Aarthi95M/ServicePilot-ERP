'use client';
// app/(dashboard)/employees/[id]/page.tsx
// Employee detail — profile card + document badges + tabs

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useEmployee } from '@/lib/hooks/useEmployees';
import apiClient from '@/lib/api/client';
import type { DocumentStatus } from '@/lib/types';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'attendance' | 'leave'>('overview');
  const { data: employee, isLoading, error } = useEmployee(id);

  // ── ALL hooks must be declared BEFORE any conditional returns ──
  // Rule of Hooks: never place useQuery/useState/etc. after an early return.
  // Use `enabled` to prevent firing until employee data is loaded.
  const { data: attendance, isLoading: attLoading } = useQuery({
    queryKey: ['employee-attendance', id],
    queryFn: async () => {
      const r = await apiClient.get('/attendance', { params: { employeeId: id, pageSize: 30 } });
      return r.data.data;
    },
    enabled: tab === 'attendance' && !!employee,
    staleTime: 60_000,
  });

  const { data: leaves, isLoading: leavesLoading } = useQuery({
    queryKey: ['employee-leaves', id],
    queryFn: async () => {
      const r = await apiClient.get('/leave', { params: { employeeId: id, pageSize: 30 } });
      return r.data.data;
    },
    enabled: tab === 'leave' && !!employee,
    staleTime: 60_000,
  });
  // ───────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-lg bg-gray-100 animate-pulse"/>
      <div className="h-48 rounded-xl bg-gray-100 animate-pulse"/>
    </div>
  );

  if (error || !employee) return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-[13px] text-red-700">
      Employee not found. <Link href="/employees" className="font-medium underline">Go back</Link>
    </div>
  );

  const initials = (employee.fullName ?? '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const colors = ['#0d9488','#2563eb','#7c3aed','#d97706','#dc2626'];
  const color = colors[(employee.fullName?.length ?? 0) % colors.length];

  return (
    <div>
      {/* Back + actions */}
      <div className="mb-5 flex items-center justify-between">
        <button onClick={() => router.push('/employees')} className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-700 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Employees
        </button>
        <div className="flex gap-2.5">
          <Link href={`/employees/${id}/edit`} className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* Left: profile card */}
        <div className="col-span-1 space-y-4">

          {/* Profile */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-[22px] font-bold text-white" style={{ background: color }}>
              {initials}
            </div>
            <div className="text-[16px] font-semibold text-gray-900">{employee.fullName}</div>
            <div className="mt-0.5 text-[12px] font-mono text-gray-400">{employee.employeeCode}</div>
            <div className="mt-3">
              <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${employee.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Contact info */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Contact</div>
            <div className="space-y-3">
              <InfoRow icon="✉" label="Email" value={employee.email || '—'} />
              <InfoRow icon="📱" label="Phone" value={employee.phoneNumber || '—'} />
            </div>
          </div>

          {/* Assignment */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Assignment</div>
            <div className="space-y-3">
              <InfoRow icon="🏢" label="Branch" value={employee.branchName || '—'} />
              <InfoRow icon="🏗" label="Department" value={employee.departmentName || '—'} />
              <InfoRow icon="💼" label="Position" value={employee.positionName || '—'} />
              <InfoRow icon="📅" label="Joined" value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-GB') : '—'} />
            </div>
          </div>
        </div>

        {/* Right: tabs */}
        <div className="col-span-2 space-y-4">

          {/* Document status cards */}
          <div className="grid grid-cols-3 gap-3">
            <DocCard label="Visa" status={employee.visaStatus  ?? 'NotProvided'} expiry={employee.visaExpiryDate} />
            <DocCard label="Passport" status={employee.passportStatus  ?? 'NotProvided'} expiry={employee.passportExpiryDate} />
            <DocCard label="Emirates ID" status={employee.emiratesIdStatus  ?? 'NotProvided'} expiry={employee.emiratesIdExpiryDate} />
          </div>

          {/* Tab navigation */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100">
              {(['overview', 'attendance', 'leave'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-3 text-[13px] font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="Full Name" value={employee.fullName} />
                    <DetailField label="Employee Code" value={employee.employeeCode} />
                    <DetailField label="Email" value={employee.email || '—'} />
                    <DetailField label="Phone" value={employee.phoneNumber || '—'} />
                    <DetailField label="Branch" value={employee.branchName || '—'} />
                    <DetailField label="Department" value={employee.departmentName || '—'} />
                    <DetailField label="Position" value={employee.positionName || '—'} />
                    <DetailField label="Joining Date" value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-GB') : '—'} />
                  </div>
                </div>
              )}
              {tab === 'attendance' && (
                <div>
                  {attLoading && <div className="py-8 text-center text-[13px] text-gray-400">Loading attendance...</div>}
                  {!attLoading && (!attendance?.items?.length) && (
                    <div className="py-8 text-center text-[13px] text-gray-400">No attendance records found.</div>
                  )}
                  {!attLoading && attendance?.items?.length > 0 && (
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          {['Date','Check In','Check Out','Hours','Status'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {attendance.items.map((r: any) => (
                          <tr key={r.id} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2.5 text-gray-700">{r.checkInTime ? new Date(r.checkInTime).toLocaleDateString('en-GB') : '—'}</td>
                            <td className="px-3 py-2.5 text-gray-700">{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="px-3 py-2.5 text-gray-700">{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="px-3 py-2.5 text-gray-700">{r.checkInTime && r.checkOutTime ? ((new Date(r.checkOutTime).getTime() - new Date(r.checkInTime).getTime()) / 3_600_000).toFixed(1) + 'h' : '—'}</td>
                            <td className="px-3 py-2.5">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.status === 'present' ? 'bg-green-100 text-green-700' : r.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{r.status ?? '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {tab === 'leave' && (
                <div>
                  {leavesLoading && <div className="py-8 text-center text-[13px] text-gray-400">Loading leave history...</div>}
                  {!leavesLoading && (!leaves?.items?.length) && (
                    <div className="py-8 text-center text-[13px] text-gray-400">No leave requests found.</div>
                  )}
                  {!leavesLoading && leaves?.items?.length > 0 && (
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          {['Type','From','To','Days','Status','Reason'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {leaves.items.map((r: any) => (
                          <tr key={r.id} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2.5 font-medium text-gray-700">{r.leaveTypeName ?? '—'}</td>
                            <td className="px-3 py-2.5 text-gray-700">{r.startDate ? new Date(r.startDate).toLocaleDateString('en-GB') : '—'}</td>
                            <td className="px-3 py-2.5 text-gray-700">{r.endDate ? new Date(r.endDate).toLocaleDateString('en-GB') : '—'}</td>
                            <td className="px-3 py-2.5 text-gray-700">{r.startDate && r.endDate ? Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86_400_000) + 1 : '—'}</td>
                            <td className="px-3 py-2.5">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'pending' ? 'bg-amber-100 text-amber-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{r.status ?? '—'}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-500 max-w-[160px] truncate">{r.reason || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-[14px]">{icon}</span>
      <div>
        <div className="text-[10px] text-gray-400">{label}</div>
        <div className="text-[13px] text-gray-800">{value}</div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 text-[11px] font-medium text-gray-400">{label}</div>
      <div className="text-[13px] text-gray-900">{value}</div>
    </div>
  );
}

function DocCard({ label, status, expiry }: { label: string; status: string | number | null | undefined; expiry: string | null }) {

  // Map numeric enum values → string names
  // Matches your backend: DocumentStatus enum order
  const NUMERIC_MAP: Record<number, string> = {
    0: 'NotProvided',
    1: 'Valid',
    2: 'ExpiringSoon',
    3: 'Expired',
  };

  const cfg: Record<string, { cls: string; bg: string; icon: string; label: string }> = {
    Valid:        { cls: 'text-green-700', bg: 'bg-green-50 border-green-200',  icon: '✓', label: 'Valid'          },
    ExpiringSoon: { cls: 'text-amber-700', bg: 'bg-amber-50 border-amber-200',  icon: '⚠', label: 'Expiring Soon'  },
    Expired:      { cls: 'text-red-700',   bg: 'bg-red-50 border-red-200',      icon: '✕', label: 'Expired'        },
    NotProvided:  { cls: 'text-gray-500',  bg: 'bg-gray-50 border-gray-200',    icon: '—', label: 'Not Provided'   },
  };

  // Normalise to string key regardless of what backend sends
  let key: string = 'NotProvided';
  if (typeof status === 'number') {
    key = NUMERIC_MAP[status] ?? 'NotProvided';
  } else if (typeof status === 'string' && status.length > 0) {
    key = status;
  }

  const { cls, bg, icon, label: displayLabel } = cfg[key] ?? cfg['NotProvided'];

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="mb-1 text-[11px] font-medium text-gray-500">{label}</div>
      <div className={`text-[13px] font-semibold ${cls}`}>{icon} {displayLabel}</div>
      {expiry && (
        <div className="mt-1 text-[11px] text-gray-400">
          {new Date(expiry).toLocaleDateString('en-GB')}
        </div>
      )}
    </div>
  );
}

