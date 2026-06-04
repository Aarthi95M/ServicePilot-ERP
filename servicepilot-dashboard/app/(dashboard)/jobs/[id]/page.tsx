'use client';
// app/(dashboard)/jobs/[id]/page.tsx — v2
// Uses global toast, fixed assign + status flow

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLookups } from '@/lib/hooks/useLookups';
import { useToast } from '@/components/shared/ToastProvider';
import apiClient from '@/lib/api/client';
import { LeafletMap } from '@/components/shared/LeafletMap';

function useJobDetail(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => { const r = await apiClient.get(`/jobs/${id}`); return r.data.data; },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

function useEmployeeLookup() {
  return useQuery({
    queryKey: ['employee-lookup'],
    queryFn: async () => { const r = await apiClient.get('/lookups/employees'); return r.data.data || []; },
    staleTime: 5 * 60 * 1000,
  });
}

const PRIORITY_CONFIG: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-amber-100 text-amber-700',
  Medium:   'bg-blue-100 text-blue-700',
  Low:      'bg-gray-100 text-gray-500',
};

// Status names that require an employee to be assigned first
// Adjust these to match your actual job_statuses table names
const STATUSES_REQUIRING_EMPLOYEE = ['Assigned', 'In Progress', 'On Site', 'Completed'];

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { showToast } = useToast();

  const { data: job, isLoading, error } = useJobDetail(id);
  const { data: lookups } = useLookups();
  const { data: employees } = useEmployeeLookup();

  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Pre-select currently assigned employee when opening assign panel
  useEffect(() => {
    if (showAssignPicker && job?.assignedEmployeeId) {
      setSelectedEmployeeId(job.assignedEmployeeId);
    }
  }, [showAssignPicker, job]);

  // ── Status update ─────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: ({ jobStatusId }: { jobStatusId: string }) =>
      apiClient.put(`/jobs/${id}/status`, { jobStatusId }).then(r => r.data),
    onSuccess: (res) => {
      setShowStatusPicker(false);
      if (res.success) {
        qc.invalidateQueries({ queryKey: ['jobs', id] });
        qc.invalidateQueries({ queryKey: ['jobs'] });
        showToast('Job status updated successfully', 'success');
      } else {
        showToast(res.message || 'Failed to update status', 'error');
      }
    },
    onError: (err: any) => {
      setShowStatusPicker(false);
      const msg = err?.message || err?.Message || 'Failed to update status';
      showToast(msg, 'error');
    },
  });

  // ── Assign employee ───────────────────────────────────────────
  const assignEmployee = useMutation({
    mutationFn: (assignedEmployeeId: string) =>
      apiClient.put(`/jobs/${id}/assign`, { assignedEmployeeId }).then(r => r.data),
    onSuccess: (res) => {
      setShowAssignPicker(false);
      if (res.success) {
        qc.invalidateQueries({ queryKey: ['jobs', id] });
        qc.invalidateQueries({ queryKey: ['jobs'] });
        showToast('Employee assigned successfully', 'success');
      } else {
        showToast(res.message || 'Failed to assign employee', 'error');
      }
    },
    onError: (err: any) => {
      setShowAssignPicker(false);
      const msg = err?.message || err?.Message || 'Failed to assign employee';
      showToast(msg, 'error');
    },
  });

  const handleStatusChange = (statusId: string, statusName: string) => {
    // Frontend validation: check if this status requires an employee
    const requiresEmployee = STATUSES_REQUIRING_EMPLOYEE
      .some(s => statusName.toLowerCase().includes(s.toLowerCase()));

    if (requiresEmployee && !job?.assignedEmployeeId) {
      setShowStatusPicker(false);
      showToast(
        `Cannot set status to "${statusName}" — please assign an employee first`,
        'warning'
      );
      return;
    }

    if (statusId === job?.jobStatusId) {
      setShowStatusPicker(false);
      showToast('Job is already in this status', 'warning');
      return;
    }

    updateStatus.mutate({ jobStatusId: statusId });
  };

  const handleAssign = () => {
    if (!selectedEmployeeId) {
      showToast('Please select an employee to assign', 'warning');
      return;
    }
    assignEmployee.mutate(selectedEmployeeId);
  };

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-lg bg-gray-100 animate-pulse"/>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 h-64 rounded-xl bg-gray-100 animate-pulse"/>
        <div className="h-64 rounded-xl bg-gray-100 animate-pulse"/>
      </div>
    </div>
  );

  if (error || !job) return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-[13px] text-red-700">
      Job not found. <Link href="/jobs" className="font-medium underline">Go back</Link>
    </div>
  );

  return (
    <div>
      {/* Back + actions */}
      <div className="mb-5 flex items-center justify-between">
        <button onClick={() => router.push('/jobs')}
          className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-700 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Jobs
        </button>

        <div className="flex gap-2.5">
          <Link href={`/jobs/${id}/edit`}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </Link>

          {/* ASSIGN EMPLOYEE */}
          <div className="relative">
            <button onClick={() => { setShowAssignPicker(v => !v); setShowStatusPicker(false); }}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              {job.assignedEmployeeName ? 'Reassign' : 'Assign Employee'}
            </button>

            {showAssignPicker && (
              <div className="absolute right-0 top-11 z-[2000] w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <div className="text-[13px] font-semibold text-gray-900">Assign Employee</div>
                  {job.assignedEmployeeName && (
                    <div className="mt-0.5 text-[11px] text-gray-400">Currently: {job.assignedEmployeeName}</div>
                  )}
                </div>
                <div className="p-3 space-y-3">
                  <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-900 outline-none focus:border-blue-600 transition-colors">
                    <option value="">Select employee...</option>
                    {(employees || []).map((e: any) => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAssignPicker(false); setSelectedEmployeeId(''); }}
                      className="flex-1 rounded-lg border border-gray-200 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleAssign} disabled={assignEmployee.isPending || !selectedEmployeeId}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-btn py-2 text-[12px] font-semibold text-white hover:bg-btn-hover disabled:opacity-60 transition-colors">
                      {assignEmployee.isPending ? (
                        <><svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Assigning...</>
                      ) : 'Assign'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* UPDATE STATUS */}
          <div className="relative">
            <button onClick={() => { setShowStatusPicker(v => !v); setShowAssignPicker(false); }}
              disabled={updateStatus.isPending}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-btn px-4 text-[13px] font-semibold text-white transition-colors hover:bg-btn-hover disabled:opacity-70">
              {updateStatus.isPending ? (
                <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Updating...</>
              ) : (
                <>Update Status<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></>
              )}
            </button>

            {showStatusPicker && (
              <div className="absolute right-0 top-11 z-[2000] w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-4 py-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Change status to</div>
                </div>
                {(lookups?.jobStatuses || []).map((s: any) => {
                  const isCurrent = s.id === job.jobStatusId;
                  const requiresEmployee = STATUSES_REQUIRING_EMPLOYEE
                    .some(name => s.label?.toLowerCase().includes(name.toLowerCase()));
                  const blocked = requiresEmployee && !job.assignedEmployeeId;

                  return (
                    <button key={s.id}
                      onClick={() => handleStatusChange(s.id, s.label)}
                      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] transition-colors ${isCurrent ? 'bg-blue-50 text-blue-700' : blocked ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.colorCode || '#94a3b8' }}/>
                      <span className="flex-1">{s.label}</span>
                      {isCurrent && <span className="text-[10px] text-blue-500 font-medium">Current</span>}
                      {blocked && !isCurrent && (
                        <span title="Assign employee first">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </span>
                      )}
                    </button>
                  );
                })}
                {!lookups?.jobStatuses?.length && (
                  <div className="px-4 py-3 text-[12px] text-gray-400">No statuses configured</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">

          {/* Job info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="font-mono text-[12px] text-gray-400">{job.jobNumber}</div>
                <h2 className="mt-0.5 text-[18px] font-bold text-gray-900">{job.customerName}</h2>
              </div>
              <div className="flex items-center gap-2">
                {job.priorityLabel && (
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${PRIORITY_CONFIG[job.priorityLabel] || 'bg-gray-100 text-gray-500'}`}>
                    {job.priorityLabel}
                  </span>
                )}
                {job.jobStatusName && (
                  <span className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-[12px] font-medium text-gray-700">
                    <span className="h-2 w-2 rounded-full" style={{ background: job.statusColor || '#94a3b8' }}/>
                    {job.jobStatusName}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DetailRow icon="📍" label="Address" value={job.address || '—'} />
              <DetailRow icon="📞" label="Customer Phone" value={job.customerPhone || '—'} />
              <DetailRow icon="🔧" label="Job Type" value={job.jobTypeName || '—'} />
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 text-[14px]">👷</span>
                <div>
                  <div className="text-[10px] font-medium text-gray-400">Assigned To</div>
                  <div className="text-[13px] text-gray-800">
                    {job.assignedEmployeeName || (
                      <span className="text-gray-400 italic text-[12px]">
                        Unassigned ·{' '}
                        <button onClick={() => { setShowAssignPicker(true); setShowStatusPicker(false); }}
                          className="text-blue-600 not-italic hover:underline">
                          Assign now
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <DetailRow icon="📅" label="Scheduled" value={job.scheduledAt ? new Date(job.scheduledAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'} />
              <DetailRow icon="⏱" label="Started" value={job.startedAt ? new Date(job.startedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'} />
              <DetailRow icon="✅" label="Completed" value={job.completedAt ? new Date(job.completedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'} />
            </div>

            {job.notes && (
              <div className="mt-4 rounded-lg bg-gray-50 p-4">
                <div className="mb-1 text-[11px] font-medium text-gray-400">Notes</div>
                <p className="text-[13px] text-gray-700">{job.notes}</p>
              </div>
            )}
          </div>

          {/* Status timeline */}
          {job.statusHistory && job.statusHistory.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-[14px] font-semibold text-gray-900">Status History</h3>
              <div className="relative pl-5">
                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-gray-100"/>
                {job.statusHistory.map((h: any) => (
                  <div key={h.id} className="relative mb-4 last:mb-0">
                    <div className="absolute -left-4 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-btn shadow-sm"/>
                    <div className="text-[13px] font-medium text-gray-900">
                      {h.oldStatusName ? `${h.oldStatusName} → ${h.newStatusName}` : `Set to ${h.newStatusName}`}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-400">
                      {h.changedByName && `By ${h.changedByName} · `}
                      {new Date(h.changedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photos */}
          {job.photos && job.photos.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-[14px] font-semibold text-gray-900">Job Photos</h3>
              <div className="grid grid-cols-3 gap-3">
                {job.photos.map((photo: any) => (
                  <div key={photo.id} className="relative overflow-hidden rounded-lg bg-gray-100">
                    <img src={photo.photoUrl} alt={photo.photoType} className="aspect-square w-full object-cover"/>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5">
                      <span className="text-[10px] font-medium text-white">{photo.photoType}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="col-span-1 space-y-4">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="text-[13px] font-semibold text-gray-900">Job Location</div>
              {job.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Open in Maps
                </a>
              )}
            </div>
            {/* Job location map — shows pin when lat/lng available */}
            {job.latitude && job.longitude ? (
              <LeafletMap
                center={[Number(job.latitude), Number(job.longitude)]}
                zoom={15}
                markers={[{
                  lat:   Number(job.latitude),
                  lng:   Number(job.longitude),
                  label: job.customerName ?? 'Job site',
                  popup: job.address ?? job.customerName ?? 'Job site',
                  color: 'blue',
                }]}
                height="200px"
              />
            ) : (
              /* No coordinates — show address-only placeholder */
              <div className="flex h-[200px] flex-col items-center justify-center gap-2 bg-[#f1f5f9]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                {job.address ? (
                  <div className="max-w-[200px] text-center text-[11px] text-gray-600">{job.address}</div>
                ) : (
                  <div className="text-[11px] text-gray-400">No location set</div>
                )}
                <div className="text-[10px] text-gray-300">GPS coordinates not available</div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Quick Info</div>
            <div className="space-y-2.5">
              <QuickRow label="Job Number" value={job.jobNumber || '—'} />
              <QuickRow label="Created" value={new Date(job.createdAt).toLocaleDateString('en-GB')} />
              <QuickRow label="Photos" value={`${job.photos?.length || 0} uploaded`} />
              <QuickRow label="Status changes" value={`${job.statusHistory?.length || 0}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showStatusPicker || showAssignPicker) && (
        <div className="fixed inset-0 z-[1900]"
          onClick={() => { setShowStatusPicker(false); setShowAssignPicker(false); }}/>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-[14px]">{icon}</span>
      <div>
        <div className="text-[10px] font-medium text-gray-400">{label}</div>
        <div className="text-[13px] text-gray-800">{value}</div>
      </div>
    </div>
  );
}

function QuickRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-gray-500">{label}</span>
      <span className="text-[12px] font-medium text-gray-800">{value}</span>
    </div>
  );
}
