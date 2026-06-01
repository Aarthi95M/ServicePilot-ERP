'use client';
// app/(dashboard)/org/page.tsx
// Org structure — Branches, Departments, Positions tabs with CRUD

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

function useOrgData(type: string) {
  return useQuery({
    queryKey: ['org', type],
    queryFn: async () => { const r = await apiClient.get(`/org/${type}`); return r.data.data; },
    staleTime: 5 * 60 * 1000,
  });
}

type OrgTab = 'branches' | 'departments' | 'positions';

export default function OrgPage() {
  const [tab, setTab] = useState<OrgTab>('branches');
  const qc = useQueryClient();
  const { data, isLoading } = useOrgData(tab);

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({ name: '', description: '', address: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (dto: any) => apiClient.post(`/org/${tab}`, dto).then(r => r.data),
    onSuccess: (res) => { if (res.success) { qc.invalidateQueries({ queryKey: ['org', tab] }); closeForm(); } },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => apiClient.put(`/org/${tab}/${id}`, dto).then(r => r.data),
    onSuccess: (res) => { if (res.success) { qc.invalidateQueries({ queryKey: ['org', tab] }); closeForm(); } },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/org/${tab}/${id}`).then(r => r.data),
    onSuccess: (res) => { if (res.success) { qc.invalidateQueries({ queryKey: ['org', tab] }); } else { alert(res.message); } },
  });

  const openCreate = () => { setEditItem(null); setForm({ name: '', description: '', address: '' }); setErrors({}); setShowForm(true); };
  const openEdit = (item: any) => { setEditItem(item); setForm({ name: item.name || '', description: item.description || '', address: item.address || '', isActive: String(item.isActive) }); setErrors({}); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditItem(null); setForm({ name: '', description: '', address: '' }); };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const dto: any = { name: form.name.trim(), isActive: true };
    if (tab === 'positions') dto.description = form.description || undefined;
    if (tab === 'branches') dto.address = form.address || undefined;
    if (editItem) { updateMutation.mutate({ id: editItem.id, dto: { ...dto, isActive: form.isActive !== 'false' } }); }
    else { createMutation.mutate(dto); }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const TABS: { id: OrgTab; label: string }[] = [
    { id: 'branches',    label: 'Branches'    },
    { id: 'departments', label: 'Departments' },
    { id: 'positions',   label: 'Positions'   },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Organisation Structure</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">Manage branches, departments, and positions</p>
        </div>
        <button onClick={openCreate} className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-[13px] font-semibold text-white hover:bg-blue-800 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add {tab === 'branches' ? 'Branch' : tab === 'departments' ? 'Department' : 'Position'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-gray-200 bg-white p-1.5 w-fit shadow-sm">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false); }}
            className={`rounded-lg px-5 py-2 text-[13px] font-medium transition-colors ${tab === t.id ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* List */}
        <div className={showForm ? 'col-span-2' : 'col-span-3'}>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {isLoading && (
              <div className="divide-y divide-gray-50">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 space-y-2"><div className="h-3.5 w-32 rounded bg-gray-100 animate-pulse"/><div className="h-3 w-20 rounded bg-gray-100 animate-pulse"/></div>
                    <div className="h-6 w-12 rounded-full bg-gray-100 animate-pulse"/>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && data && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Name</th>
                    {tab === 'positions' && <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Description</th>}
                    {tab === 'branches' && <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Address</th>}
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Employees</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(data || []).map((item: any) => (
                    <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-[13px] font-medium text-gray-900">{item.name}</td>
                      {tab === 'positions' && <td className="px-5 py-3.5 text-[13px] text-gray-500">{item.description || '—'}</td>}
                      {tab === 'branches' && <td className="px-5 py-3.5 text-[13px] text-gray-500 max-w-[180px] truncate">{item.address || '—'}</td>}
                      <td className="px-5 py-3.5 text-[13px] text-gray-700 tabular-nums">{item.employeeCount}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(item)} className="rounded-md px-2.5 py-1 text-[12px] font-medium text-blue-600 hover:bg-blue-50 transition-colors">Edit</button>
                          {item.isActive && (
                            <button onClick={() => { if (item.employeeCount > 0) { alert(`Cannot deactivate — ${item.employeeCount} employees assigned.`); return; } if (confirm(`Deactivate ${item.name}?`)) deactivateMutation.mutate(item.id); }}
                              className="rounded-md px-2.5 py-1 text-[12px] font-medium text-red-500 hover:bg-red-50 transition-colors">Deactivate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && (!data || data.length === 0) && (
              <div className="py-16 text-center text-[13px] text-gray-400">
                No {tab} found. Add your first one.
              </div>
            )}
          </div>
        </div>

        {/* Inline form panel */}
        {showForm && (
          <div className="col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sticky top-[76px]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-gray-900">
                  {editItem ? 'Edit' : 'New'} {tab === 'branches' ? 'Branch' : tab === 'departments' ? 'Department' : 'Position'}
                </h3>
                <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-gray-600">Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={`${tab === 'branches' ? 'Dubai Marina Branch' : tab === 'departments' ? 'HVAC Department' : 'Senior Technician'}`}
                    className={`w-full rounded-lg border ${errors.name ? 'border-red-400' : 'border-gray-200'} px-3.5 py-2.5 text-[13px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors`}/>
                  {errors.name && <p className="mt-1 text-[11px] text-red-600">{errors.name}</p>}
                </div>
                {tab === 'branches' && (
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-gray-600">Address</label>
                    <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Building, Area, City" className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"/>
                  </div>
                )}
                {tab === 'positions' && (
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-gray-600">Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Position description..."
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors resize-none"/>
                  </div>
                )}
                {editItem && (
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-gray-600">Status</label>
                    <select value={form.isActive ?? 'true'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none focus:border-blue-600 transition-colors">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={closeForm} className="flex-1 rounded-lg border border-gray-200 py-2 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                  <button onClick={handleSubmit} disabled={isPending} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-700 py-2 text-[13px] font-semibold text-white hover:bg-blue-800 disabled:opacity-70 transition-colors">
                    {isPending && <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                    {editItem ? 'Save' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
