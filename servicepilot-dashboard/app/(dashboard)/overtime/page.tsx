'use client';
// app/(dashboard)/overtime/page.tsx
// Overtime requests — list + detail panel with approve/reject
// Matches your Figma: OT-001 detail panel with AED calculations

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { useToast } from '@/components/shared/ToastProvider';

function useOvertimeRequests(params: Record<string, any>) {
  return useQuery({
    queryKey: ['overtime', params],
    queryFn: async () => {
      const res = await apiClient.get('/overtime', { params });
      return res.data.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (prev: any) => prev,
  });
}

function useOvertimeAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      apiClient.put(`/overtime/${id}/action`, { status, reason }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
  });
}

const STATUS_CONFIG: Record<string, { cls: string }> = {
  Pending:   { cls: 'bg-amber-100 text-amber-700'  },
  Approved:  { cls: 'bg-green-100 text-green-700'  },
  Rejected:  { cls: 'bg-red-100 text-red-600'      },
  Cancelled: { cls: 'bg-gray-100 text-gray-500'    },
};

// Overtime rate — in a real app this comes from employee salary data
const OT_RATE_PER_HOUR = 45; // AED

export default function OvertimePage() {
  const [params, setParams] = useState({ page: 1, pageSize: 20, status: 'Pending' });
  const [selected, setSelected] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { showToast } = useToast();
  const { data, isLoading } = useOvertimeRequests(params);
  const action = useOvertimeAction();

  const handleAction = (id: string, status: 'Approved' | 'Rejected') => {
    action.mutate(
      { id, status, reason: status === 'Rejected' ? rejectReason : undefined },
      {
        onSuccess: (res) => {
          if (res.success) {
            setSelected(null);
            setRejectReason('');
            showToast(
              status === 'Approved' ? 'Overtime request approved' : 'Overtime request rejected',
              status === 'Approved' ? 'success' : 'warning'
            );
          } else {
            showToast(res.message || 'Action failed', 'error');
          }
        },
        onError: (err: any) => showToast(err?.message || 'Action failed', 'error'),
      }
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Overtime</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">Review and approve overtime requests</p>
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* LEFT: list */}
        <div className="col-span-2">
          {/* Status filters */}
          <div className="mb-4 flex gap-2">
            {(['', 'Pending', 'Approved', 'Rejected'] as const).map(s => (
              <button key={s} onClick={() => setParams(p => ({ ...p, status: s || undefined as any, page: 1 }))}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${(params.status === s || (!params.status && !s)) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {isLoading && (
              <div className="divide-y divide-gray-50">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse"/>
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-32 rounded bg-gray-100 animate-pulse"/>
                      <div className="h-3 w-48 rounded bg-gray-100 animate-pulse"/>
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
                    const isSelected = selected?.id === req.id;
                    const amount = (req.hoursRequested * OT_RATE_PER_HOUR).toFixed(0);

                    return (
                      <div key={req.id}
                        onClick={() => setSelected(isSelected ? null : req)}
                        className={`flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}>
                        {/* Avatar */}
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: color }}>
                          {initials}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-gray-900">{req.employeeName}</span>
                            <span className="text-[11px] font-mono text-gray-400">{req.employeeCode}</span>
                            <span className={`ml-1 rounded-full px-2 py-px text-[10px] font-semibold ${STATUS_CONFIG[req.status]?.cls || 'bg-gray-100 text-gray-500'}`}>
                              {req.status}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[12px] text-gray-500">
                            Date: {req.requestDate} · {req.hoursRequested}h · AED {amount}
                          </div>
                          {req.reason && <div className="text-[11px] text-gray-400 truncate">{req.reason}</div>}
                        </div>
                        {/* Amount */}
                        <div className="text-right">
                          <div className="text-[14px] font-bold text-gray-900">AED {amount}</div>
                          <div className="text-[11px] text-gray-400">{req.hoursRequested}h</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {data.items?.length === 0 && (
                  <div className="py-16 text-center text-[13px] text-gray-400">No overtime requests found</div>
                )}

                {data.totalCount > params.pageSize && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                    <span className="text-[12px] text-gray-500">{data.totalCount} total</span>
                    <div className="flex gap-1.5">
                      <button disabled={params.page === 1} onClick={() => setParams(p => ({ ...p, page: p.page - 1 }))}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">Prev</button>
                      <button disabled={params.page * params.pageSize >= data.totalCount} onClick={() => setParams(p => ({ ...p, page: p.page + 1 }))}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT: detail panel — matches your Figma OT-001 design */}
        <div className="col-span-1">
          {selected ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm sticky top-[76px] overflow-hidden">
              {/* Blue header strip — like your Figma */}
              <div className="bg-blue-700 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[13px] font-bold text-white">
                    OT-{selected.id.slice(-3).toUpperCase()}
                  </div>
                  <button onClick={() => setSelected(null)} className="text-blue-200 hover:text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="mt-2 text-[15px] font-semibold text-white">{selected.employeeName}</div>
                <div className="text-[12px] text-blue-200">{selected.employeeCode}</div>
              </div>

              <div className="p-5 space-y-4">
                {/* Time details */}
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Time Details</div>
                  <div className="space-y-2">
                    <OTRow label="Date" value={selected.requestDate} />
                    <OTRow label="Hours Requested" value={`${selected.hoursRequested}h`} />
                    <OTRow label="Status" value={selected.status} />
                  </div>
                </div>

                {/* Reason */}
                {selected.reason && (
                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Reason</div>
                    <p className="text-[13px] text-gray-700 leading-relaxed">{selected.reason}</p>
                  </div>
                )}

                {/* AED Calculation — matches your Figma */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Calculation</div>
                  <OTRow label="Overtime Rate" value={`AED ${OT_RATE_PER_HOUR}/hour`} />
                  <OTRow label="Hours" value={`${selected.hoursRequested}h`} />
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-gray-900">Total Amount</span>
                      <span className="text-[18px] font-bold text-blue-700">
                        AED {(selected.hoursRequested * OT_RATE_PER_HOUR).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {selected.status === 'Pending' && (
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Rejection reason (optional)..." rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-700 outline-none focus:border-blue-600 resize-none"/>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(selected.id, 'Approved')} disabled={action.isPending}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2.5 text-[13px] font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Approve
                      </button>
                      <button onClick={() => handleAction(selected.id, 'Rejected')} disabled={action.isPending}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2.5 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {selected.approvedByName && (
                  <div className="border-t border-gray-100 pt-4 text-[12px] text-gray-400">
                    {selected.status} by {selected.approvedByName} on {new Date(selected.approvedAt).toLocaleDateString('en-GB')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <p className="text-[13px] text-gray-400">Click a request to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OTRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12px] text-gray-500">{label}</span>
      <span className="text-[12px] font-medium text-gray-800">{value}</span>
    </div>
  );
}
