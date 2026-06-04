'use client';
// app/(dashboard)/jobs/page.tsx
// Job board — Kanban view + List view + Create job button

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SortArrow } from '@/lib/hooks/useTableSort';
import apiClient from '@/lib/api/client';

function useJobs(params: Record<string, any>) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: async () => {
      const res = await apiClient.get('/jobs', { params });
      return res.data.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (prev: any) => prev,
  });
}

function useUpdateJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
      apiClient.put(`/jobs/${id}/status`, { jobStatusId: statusId }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  Critical: { label: 'Critical', cls: 'bg-red-100 text-red-700'    },
  High:     { label: 'High',     cls: 'bg-amber-100 text-amber-700' },
  Medium:   { label: 'Medium',   cls: 'bg-blue-100 text-blue-700'   },
  Low:      { label: 'Low',      cls: 'bg-gray-100 text-gray-500'   },
};

export default function JobsPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [params, setParams] = useState<Record<string,any>>({ page: 1, pageSize: 100, sortBy: 'createdAt', sortDir: 'desc' });
  const toggleJobSort = (col: string) => setParams(p => ({
    ...p, sortBy: col,
    sortDir: p.sortBy === col && p.sortDir === 'asc' ? 'desc' : 'asc',
    page: 1,
  }));

  const { data, isLoading } = useJobs(params);
  const updateStatus = useUpdateJobStatus();

  // Group jobs by status for kanban
  const jobsByStatus: Record<string, { color: string; jobs: any[] }> = {};
  if (data?.items) {
    data.items.forEach((job: any) => {
      const key = job.jobStatusName || 'Unassigned';
      if (!jobsByStatus[key]) jobsByStatus[key] = { color: job.statusColor || '#94a3b8', jobs: [] };
      jobsByStatus[key].jobs.push(job);
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Jobs</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">{data?.totalCount || 0} total jobs</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            {(['kanban', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium capitalize transition-colors ${view === v ? 'bg-btn text-white' : 'text-gray-600 hover:text-gray-800'}`}>
                {v === 'kanban' ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                )}
                {v}
              </button>
            ))}
          </div>
          <Link href="/jobs/new" className="flex h-9 items-center gap-1.5 rounded-lg bg-btn px-4 text-[13px] font-semibold text-white transition-colors hover:bg-btn-hover">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Job
          </Link>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
        <div>
          {isLoading && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-72 flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 h-4 w-24 rounded bg-gray-200 animate-pulse"/>
                  {[1,2,3].map(j => <div key={j} className="mb-2.5 h-24 rounded-lg bg-white animate-pulse"/>)}
                </div>
              ))}
            </div>
          )}

          {!isLoading && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Object.entries(jobsByStatus).map(([status, { color, jobs }]) => (
                <div key={status} className="w-[280px] flex-shrink-0">
                  {/* Column header */}
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }}/>
                    <span className="text-[13px] font-semibold text-gray-700">{status}</span>
                    <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">{jobs.length}</span>
                  </div>

                  {/* Job cards */}
                  <div className="space-y-2.5">
                    {jobs.map((job: any) => (
                      <Link key={job.id} href={`/jobs/${job.id}`}
                        className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="font-mono text-[11px] text-gray-400">{job.jobNumber}</div>
                          {job.priorityLabel && (
                            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_CONFIG[job.priorityLabel]?.cls || 'bg-gray-100 text-gray-500'}`}>
                              {job.priorityLabel}
                            </span>
                          )}
                        </div>
                        <div className="mb-1 text-[13px] font-medium text-gray-900 line-clamp-1">{job.customerName}</div>
                        {job.address && (
                          <div className="mb-2.5 flex items-center gap-1 text-[11px] text-gray-400">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span className="truncate">{job.address}</span>
                          </div>
                        )}
                        {job.assignedEmployeeName && (
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[8px] font-bold text-blue-700">
                              {job.assignedEmployeeName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="text-[11px] text-gray-500">{job.assignedEmployeeName}</span>
                          </div>
                        )}
                        {!job.assignedEmployeeName && (
                          <span className="text-[11px] italic text-gray-300">Unassigned</span>
                        )}
                      </Link>
                    ))}

                    {jobs.length === 0 && (
                      <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-[12px] text-gray-300">
                        No jobs
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {Object.keys(jobsByStatus).length === 0 && !isLoading && (
                <div className="flex w-full items-center justify-center py-16 text-[13px] text-gray-400">
                  No jobs found. Create your first job to get started.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div>
          {/* Filters */}
          <div className="mb-4 flex gap-3">
            <div className="flex h-9 flex-1 max-w-[300px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 focus-within:border-blue-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search customer, job number..." className="flex-1 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
                onChange={e => setParams(p => ({ ...p, search: e.target.value, page: 1 }))}/>
            </div>
            <select onChange={e => setParams(p => ({ ...p, priority: e.target.value || undefined, page: 1 }))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none focus:border-blue-600">
              <option value="">All priorities</option>
              <option value="1">Critical</option>
              <option value="2">High</option>
              <option value="3">Medium</option>
              <option value="4">Low</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {isLoading && <div className="divide-y divide-gray-50">{[1,2,3,4,5].map(i => <div key={i} className="flex gap-4 px-5 py-4">{[40,24,20,20,16].map((w,j) => <div key={j} className={`h-3.5 w-${w} rounded bg-gray-100 animate-pulse`}/>)}</div>)}</div>}
            {!isLoading && data && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {[
                      { label: 'Job',         col: 'jobNumber'            },
                      { label: 'Customer',    col: 'customerName'         },
                      { label: 'Assigned To', col: 'assignedEmployeeName' },
                      { label: 'Status',      col: 'jobStatusName'        },
                      { label: 'Priority',    col: 'priorityLabel'        },
                      { label: 'Scheduled',   col: 'scheduledAt'          },
                    ].map(({ label, col }) => (
                      <th key={col}
                        onClick={() => toggleJobSort(col)}
                        className={`cursor-pointer select-none px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider transition-colors ${params.sortBy === col ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                        {label}
                        <SortArrow col={col} sortKey={params.sortBy} sortDir={params.sortDir}/>
                      </th>
                    ))}
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(data.items || []).map((job: any) => (
                    <tr key={job.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-[12px] text-gray-500">{job.jobNumber}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-[13px] font-medium text-gray-900">{job.customerName}</div>
                        {job.address && <div className="text-[11px] text-gray-400 truncate max-w-[160px]">{job.address}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-gray-700">{job.assignedEmployeeName || <span className="italic text-gray-300">Unassigned</span>}</td>
                      <td className="px-5 py-3.5">
                        {job.jobStatusName && (
                          <span className="flex items-center gap-1.5 text-[12px] font-medium">
                            <span className="h-2 w-2 rounded-full" style={{ background: job.statusColor || '#94a3b8' }}/>
                            {job.jobStatusName}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {job.priorityLabel && (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_CONFIG[job.priorityLabel]?.cls || 'bg-gray-100 text-gray-500'}`}>
                            {job.priorityLabel}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-gray-500">
                        {job.scheduledAt ? new Date(job.scheduledAt).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/jobs/${job.id}`} className="rounded-md px-2.5 py-1 text-[12px] font-medium text-blue-600 hover:bg-blue-50 transition-colors">View</Link>
                          <Link href={`/jobs/${job.id}/edit`} className="rounded-md px-2.5 py-1 text-[12px] font-medium text-gray-500 hover:bg-gray-100 transition-colors">Edit</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && data?.items?.length === 0 && (
              <div className="py-16 text-center text-[13px] text-gray-400">No jobs found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
