'use client';
// app/(dashboard)/leave/page.tsx
// Leave requests — list with approve/reject + leave balance summary tab

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { SortArrow } from '@/lib/hooks/useTableSort';
import { useToast } from '@/components/shared/ToastProvider';
import { ConfirmDialog, type ConfirmDialogState } from '@/components/shared/ConfirmDialog';
import { useAuthStore } from '@/lib/store/auth';
import { useLookups } from '@/lib/hooks/useLookups';

// Returns today's date as 'YYYY-MM-DD' — the format native <input type="date"> expects.
function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function useLeaveRequests(params: Record<string, any>) {
  return useQuery({
    queryKey: ['leave', params],
    queryFn: async () => {
      const res = await apiClient.get('/leave', { params });
      return res.data.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (prev: any) => prev,
  });
}

function useLeaveSummary(year: number) {
  return useQuery({
    queryKey: ['leave-summary', year],
    queryFn: async () => {
      const res = await apiClient.get('/leave/summary', { params: { year } });
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });
}

function useLeaveAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      apiClient.put(`/leave/${id}/action`, { status, reason }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave'] }),
  });
}

const STATUS_CONFIG: Record<string, { cls: string; label: string }> = {
  Pending:   { cls: 'bg-blue-100 text-blue-700',   label: 'Pending'   },
  Approved:  { cls: 'bg-green-100 text-green-700', label: 'Approved'  },
  Rejected:  { cls: 'bg-red-100 text-red-600',     label: 'Rejected'  },
  Cancelled: { cls: 'bg-gray-100 text-gray-500',   label: 'Cancelled' },
};

export default function LeavePage() {
  const [tab, setTab] = useState<'requests' | 'summary'>('requests');
  const [params, setParams] = useState<Record<string,any>>({ page: 1, pageSize: 20, status: 'Pending', sortBy: 'createdAt', sortDir: 'desc' });
  const toggleLeaveSort = (col: string) => setParams(p => ({
    ...p, sortBy: col,
    sortDir: p.sortBy === col && p.sortDir === 'asc' ? 'desc' : 'asc',
    page: 1,
  }));
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [summarySearch, setSummarySearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  // Custom in-app confirmation dialog state — replaces browser confirm() popups
  const [dialog, setDialog] = useState<ConfirmDialogState | null>(null);
  // "Apply Leave for Employee" modal — Admin/Supervisor/HR Manager only
  // (lets HR/management file a possibly-backdated leave request on behalf
  // of an employee who forgot to submit it themselves)
  const [showApplyModal, setShowApplyModal] = useState(false);

  const { showToast } = useToast();
  const hasRole = useAuthStore(s => s.hasRole);
  const canApplyOnBehalf = hasRole(['Admin', 'Supervisor', 'HRManager']);
  const { data, isLoading } = useLeaveRequests(params);
  const { data: summary, isLoading: summaryLoading } = useLeaveSummary(summaryYear);
  const action = useLeaveAction();

  // Performs the actual approve/reject API call (called only after the user confirms)
  const performAction = (id: string, status: 'Approved' | 'Rejected') => {
    action.mutate(
      { id, status, reason: status === 'Rejected' ? rejectReason : undefined },
      {
        onSuccess: (res) => {
          if (res.success) {
            setSelectedRequest(null);
            setRejectReason('');
            setDialog(null);
            showToast(
              status === 'Approved' ? 'Leave request approved' : 'Leave request rejected',
              status === 'Approved' ? 'success' : 'warning'
            );
          } else {
            setDialog(null);
            showToast(res.message || 'Action failed', 'error');
          }
        },
        onError: (err: any) => {
          setDialog(null);
          showToast(err?.message || 'Action failed', 'error');
        },
      }
    );
  };

  // Opens the custom confirmation dialog before approving/rejecting — no browser confirm()
  const handleAction = (id: string, status: 'Approved' | 'Rejected') => {
    const isApprove = status === 'Approved';
    setDialog({
      title: isApprove ? 'Approve Leave Request' : 'Reject Leave Request',
      message: isApprove
        ? `Are you sure you want to approve this leave request for ${selectedRequest?.employeeName ?? 'this employee'}? This action will notify the employee.`
        : `Are you sure you want to reject this leave request for ${selectedRequest?.employeeName ?? 'this employee'}?${rejectReason ? '' : ' You can optionally add a rejection reason before confirming.'}`,
      confirmLabel: isApprove ? 'Approve' : 'Reject',
      confirmCls: isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
      onConfirm: () => performAction(id, status),
    });
  };

  return (
    <div>
      {/* Custom confirm dialog — replaces browser confirm() for approve/reject actions */}
      <ConfirmDialog state={dialog} onClose={() => setDialog(null)} isLoading={action.isPending} />

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Leave Requests</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">Manage employee leave requests and balances</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Admin / Supervisor / HR Manager can file a (possibly backdated)
              leave request on behalf of an employee who forgot to submit it */}
          {canApplyOnBehalf && (
            <button onClick={() => setShowApplyModal(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-btn px-4 text-[13px] font-medium text-white transition-colors hover:opacity-90">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Apply Leave for Employee
            </button>
          )}
          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            {(['requests', 'summary'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-[13px] font-medium capitalize transition-colors ${tab === t ? 'bg-btn text-white' : 'text-gray-600 hover:text-gray-800'}`}>
                {t === 'requests' ? 'Requests' : 'Balance Summary'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* "Apply Leave for Employee" modal */}
      {showApplyModal && (
        <ApplyLeaveForEmployeeModal
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => {
            setShowApplyModal(false);
            showToast('Leave request filed successfully', 'success');
          }}
        />
      )}

      {/* REQUESTS TAB */}
      {tab === 'requests' && (
        <div className="grid grid-cols-3 gap-4">
          {/* List */}
          <div className="col-span-2">
            {/* Filters + search */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {(['', 'Pending', 'Approved', 'Rejected', 'Cancelled'] as const).map(s => (
                <button key={s} onClick={() => setParams(p => ({ ...p, status: s || undefined as any, page: 1 }))}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${(params.status === s || (!params.status && !s)) ? 'bg-btn text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s || 'All'}
                </button>
              ))}
              <div className="flex h-8 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 ml-auto">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  placeholder="Search employee..."
                  className="w-36 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
                  onChange={e => setParams((p: any) => ({ ...p, search: e.target.value || undefined, page: 1 }))}/>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {isLoading && (
                <div className="divide-y divide-gray-50">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse"/>
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-32 rounded bg-gray-100 animate-pulse"/>
                        <div className="h-3 w-24 rounded bg-gray-100 animate-pulse"/>
                      </div>
                      <div className="h-6 w-16 rounded-full bg-gray-100 animate-pulse"/>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && data && (
                <>
                  <div className="divide-y divide-gray-50">
                    {(data.items || []).map((req: any) => {
                      const initials = req.employeeName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??';
                      const colors = ['#0d9488','#2563eb','#7c3aed','#d97706'];
                      const color = colors[req.employeeName?.length % colors.length] || '#2563eb';
                      const isSelected = selectedRequest?.id === req.id;

                      return (
                        <div key={req.id}
                          onClick={() => setSelectedRequest(isSelected ? null : req)}
                          className={`flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}>
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: color }}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-gray-900">{req.employeeName}</span>
                              <span className="text-[11px] font-mono text-gray-400">{req.employeeCode}</span>
                            </div>
                            <div className="mt-0.5 text-[12px] text-gray-500">
                              {req.leaveTypeName} · {req.totalDays} day{req.totalDays !== 1 ? 's' : ''} · {req.startDate} to {req.endDate}
                            </div>
                            {req.reason && <div className="mt-0.5 text-[11px] text-gray-400 truncate">{req.reason}</div>}
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_CONFIG[req.status]?.cls || 'bg-gray-100 text-gray-500'}`}>
                              {req.status}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(req.createdAt).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {data.items?.length === 0 && (
                    <div className="py-16 text-center text-[13px] text-gray-400">No leave requests found</div>
                  )}

                  {/* Pagination */}
                  {data.totalCount > params.pageSize && (
                    <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                      <span className="text-[12px] text-gray-500">{data.totalCount} total</span>
                      <div className="flex gap-1.5">
                        <button disabled={params.page === 1} onClick={() => setParams(p => ({ ...p, page: p.page - 1 }))}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">Prev</button>
                        <button disabled={params.page * params.pageSize >= data.totalCount} onClick={() => setParams(p => ({ ...p, page: p.page + 1 }))}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">Next</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Detail panel — shown when a request is selected */}
          <div className="col-span-1">
            {selectedRequest ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sticky top-[76px]">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="text-[15px] font-semibold text-gray-900">{selectedRequest.employeeName}</div>
                    <div className="text-[12px] text-gray-400">{selectedRequest.employeeCode}</div>
                  </div>
                  <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <DetailRow label="Leave Type" value={selectedRequest.leaveTypeName} />
                  <DetailRow label="Paid" value={selectedRequest.isPaid ? 'Yes' : 'No'} />
                  <DetailRow label="From" value={selectedRequest.startDate} />
                  <DetailRow label="To" value={selectedRequest.endDate} />
                  <DetailRow label="Total Days" value={`${selectedRequest.totalDays} day${selectedRequest.totalDays !== 1 ? 's' : ''}`} />
                  <DetailRow label="Status" value={selectedRequest.status} />
                  {selectedRequest.reason && <DetailRow label="Reason" value={selectedRequest.reason} />}
                  {selectedRequest.approvedByName && <DetailRow label="Actioned By" value={selectedRequest.approvedByName} />}
                </div>

                {/* Action buttons — only for Pending */}
                {selectedRequest.status === 'Pending' && (
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Rejection reason (optional)..."
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-600 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(selectedRequest.id, 'Approved')} disabled={action.isPending}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Approve
                      </button>
                      <button onClick={() => handleAction(selectedRequest.id, 'Rejected')} disabled={action.isPending}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <p className="text-[13px] text-gray-400">Click a request to view details and take action</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUMMARY TAB */}
      {tab === 'summary' && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <select value={summaryYear} onChange={e => setSummaryYear(Number(e.target.value))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600">
              {/* Show 5 past years + current + 3 future years = 9-year range */}
              {Array.from({ length: 9 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={summarySearch}
                onChange={e => setSummarySearch(e.target.value)}
                placeholder="Filter by employee..."
                className="w-40 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"/>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {summaryLoading && (
              <div className="divide-y divide-gray-50">
                {[1,2,3,4].map(i => <div key={i} className="flex gap-4 px-5 py-4"><div className="h-3.5 w-full rounded bg-gray-100 animate-pulse"/></div>)}
              </div>
            )}
            {!summaryLoading && summary && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Employee','Leave Type','Max Days','Taken','Pending','Remaining'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(summary || [])
                  .filter((emp: any) => !summarySearch || emp.employeeName?.toLowerCase().includes(summarySearch.toLowerCase()))
                  .flatMap((emp: any) =>
                    (emp.balances || []).map((bal: any, i: number) => (
                      <tr key={`${emp.employeeId}-${i}`} className="hover:bg-gray-50/50 transition-colors">
                        {i === 0 ? (
                          <td className="px-5 py-3.5" rowSpan={emp.balances.length}>
                            <div className="text-[13px] font-medium text-gray-900">{emp.employeeName}</div>
                            <div className="text-[11px] font-mono text-gray-400">{emp.employeeCode}</div>
                          </td>
                        ) : null}
                        <td className="px-5 py-3.5 text-[13px] text-gray-700">
                          {bal.leaveTypeName}
                          {bal.isPaid && <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-px text-[10px] text-green-700">Paid</span>}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-gray-700 tabular-nums">{bal.maxDaysPerYear}</td>
                        <td className="px-5 py-3.5 text-[13px] font-medium text-gray-900 tabular-nums">{bal.daysTaken}</td>
                        <td className="px-5 py-3.5 text-[13px] text-amber-600 tabular-nums">{bal.daysPending}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-blue-500 transition-all"
                                style={{ width: `${Math.min(100, (bal.daysTaken / bal.maxDaysPerYear) * 100)}%` }}/>
                            </div>
                            <span className="text-[12px] font-medium text-gray-700 tabular-nums w-6 text-right">{bal.daysRemaining}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            {!summaryLoading && (!summary || summary.length === 0) && (
              <div className="py-16 text-center text-[13px] text-gray-400">No leave data for {summaryYear}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex-shrink-0 text-[12px] text-gray-400">{label}</span>
      <span className="text-right text-[12px] font-medium text-gray-800">{value}</span>
    </div>
  );
}

// ─── Apply Leave for Employee modal ────────────────────────────────────────
// Lets Admin / Supervisor / HR Manager file a leave request ON BEHALF OF an
// employee — e.g. the employee forgot to submit it themselves and the dates
// are already in the past. Maps to POST /leave with dto.employeeId set; the
// backend resolves role + branch checks and allows backdated start dates for
// these roles (see CreateLeaveRequestDto.EmployeeId / LeaveService.CreateAsync).
interface ApplyLeaveForEmployeeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function ApplyLeaveForEmployeeModal({ onClose, onSuccess }: ApplyLeaveForEmployeeModalProps) {
  const qc = useQueryClient();
  const { data: lookups, isLoading: lookupsLoading } = useLookups();
  // Active employees for the picker — uses the dedicated lookup endpoint
  // (GET /lookups/employees → EmployeeDropdownDto[] = { id, label }), which
  // returns ALL active employees in the company pre-formatted as "CODE - Name",
  // already ordered alphabetically and cached server-side for 10 minutes.
  //
  // NOTE: this previously called useEmployees({ page: 1, pageSize: 500, ... }),
  // but PagedEmployeeRequestValidator caps pageSize at 100 — the request was
  // failing validation (400 "Page size must be between 1 and 100"), so the
  // dropdown silently never received any data. The lookup endpoint has no
  // such cap and is purpose-built for exactly this kind of dropdown.
  const { data: employees = [], isLoading: employeesLoading } = useQuery<{ id: string; label: string }[]>({
    queryKey: ['lookups', 'employees'],
    queryFn: () => apiClient.get('/lookups/employees').then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
  });

  const [form, setForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const submittingRef = useRef(false);

  const set = (field: string, value: string) => {
    setForm(p => ({ ...p, [field]: value }));
    setErrors(p => { const n = { ...p }; delete n[field]; return n; });
    setApiError('');
  };

  const createLeaveForEmployee = useMutation({
    mutationFn: (payload: any) => apiClient.post('/leave', payload).then(r => r.data),
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.employeeId) errs.employeeId = 'Please select an employee.';
    if (!form.leaveTypeId) errs.leaveTypeId = 'Please select a leave type.';
    if (!form.startDate) errs.startDate = 'Start date is required.';
    if (!form.endDate) errs.endDate = 'End date is required.';
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      errs.endDate = 'End date must be on or after start date.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setApiError('');

    createLeaveForEmployee.mutate(
      {
        employeeId:  form.employeeId,
        leaveTypeId: form.leaveTypeId,
        startDate:   form.startDate,
        endDate:     form.endDate,
        reason:      form.reason.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          submittingRef.current = false;
          if (res.success) {
            qc.invalidateQueries({ queryKey: ['leave'] });
            onSuccess();
          } else {
            setApiError(res.message || 'Failed to file leave request.');
          }
        },
        onError: (err: any) => {
          submittingRef.current = false;
          const msg = err?.response?.data?.message ?? err?.message;
          setApiError(msg && !msg.includes('status code') ? msg : 'Failed to file leave request. Please try again.');
        },
      }
    );
  };

  const inp = (hasError: boolean) =>
    `w-full rounded-lg border ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'} px-3.5 py-2.5 text-[14px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors`;

  const isPending = createLeaveForEmployee.isPending;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">

        {/* Header — fixed */}
        <div className="flex flex-shrink-0 items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-[17px] font-bold text-gray-900">Apply Leave for Employee</h2>
            <p className="mt-0.5 text-[13px] text-gray-500">
              File a leave request on behalf of an employee who forgot to submit it — backdated start dates are allowed.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body — scrolls independently */}
        <div className="space-y-4 overflow-y-auto px-6 py-5">

          {apiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-[13px] text-red-700">{apiError}</p>
            </div>
          )}

          {/* Employee picker */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Employee *</label>
            <select
              value={form.employeeId}
              onChange={e => set('employeeId', e.target.value)}
              disabled={employeesLoading}
              className={inp(!!errors.employeeId)}
            >
              <option value="">{employeesLoading ? 'Loading employees…' : 'Select employee…'}</option>
              {/* EmployeeDropdownDto = { id, label } — label is pre-formatted
                  server-side as "EMP001 - Jane Doe", so render it as-is. */}
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.label}</option>
              ))}
            </select>
            {errors.employeeId && <p className="mt-1 text-[12px] text-red-600">{errors.employeeId}</p>}
          </div>

          {/* Leave type */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Leave Type *</label>
            <select
              value={form.leaveTypeId}
              onChange={e => set('leaveTypeId', e.target.value)}
              disabled={lookupsLoading}
              className={inp(!!errors.leaveTypeId)}
            >
              <option value="">{lookupsLoading ? 'Loading…' : 'Select leave type…'}</option>
              {/* LeaveTypeDropdownDto = { id, label, maxDaysPerYear, isPaid } —
                  field is `label`, not `name` (was rendering as blank options). */}
              {(lookups?.leaveTypes || []).map((lt: any) => (
                <option key={lt.id} value={lt.id}>{lt.label}</option>
              ))}
            </select>
            {errors.leaveTypeId && <p className="mt-1 text-[12px] text-red-600">{errors.leaveTypeId}</p>}
          </div>

          {/* Date range — native date inputs, no max-in-past restriction:
              Admin/Supervisor/HR Manager are explicitly allowed to backdate
              leave filed on behalf of an employee (enforced server-side too). */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Start Date *</label>
              <input
                type="date"
                value={form.startDate}
                max={form.endDate || undefined}
                onChange={e => set('startDate', e.target.value)}
                className={inp(!!errors.startDate)}
              />
              {errors.startDate && <p className="mt-1 text-[12px] text-red-600">{errors.startDate}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">End Date *</label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={e => set('endDate', e.target.value)}
                className={inp(!!errors.endDate)}
              />
              {errors.endDate && <p className="mt-1 text-[12px] text-red-600">{errors.endDate}</p>}
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-gray-400">
            Backdated start dates are allowed for leave filed on behalf of an employee.
          </p>

          {/* Reason */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Reason</label>
            <textarea
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              placeholder="Optional — why this leave is being filed on the employee's behalf…"
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 resize-none transition-colors"
            />
          </div>
        </div>

        {/* Footer — fixed */}
        <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} disabled={isPending}
            className="rounded-lg px-4 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-60">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-btn px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60">
            {isPending && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
              </svg>
            )}
            {isPending ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
