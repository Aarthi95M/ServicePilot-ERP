'use client';
// app/(dashboard)/settings/page.tsx
// Company settings: Profile · Attendance Config · Branches · Departments ·
// Positions · Leave Types · Job Types · Job Statuses

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { ConfirmDialog, type ConfirmDialogState } from '@/components/shared/ConfirmDialog';

// ── Data hooks ────────────────────────────────────────────────────────────────

const useCompany = () =>
  useQuery({ queryKey: ['company'], queryFn: async () => (await apiClient.get('/company/me')).data.data, staleTime: 5 * 60_000 });

const useCompanyConfig = () =>
  useQuery({ queryKey: ['company-config'], queryFn: async () => (await apiClient.get('/company/config')).data.data, staleTime: 5 * 60_000 });

function useMasterList(resource: string) {
  return useQuery({
    queryKey: ['master', resource],
    queryFn: async () => (await apiClient.get(`/master/${resource}`)).data.data ?? [],
    staleTime: 60_000,
  });
}

function useOrgList(resource: string) {
  return useQuery({
    queryKey: ['org', resource],
    queryFn: async () => (await apiClient.get(`/org/${resource}`)).data.data ?? [],
    staleTime: 60_000,
  });
}

// ── Main component ────────────────────────────────────────────────────────────

type Tab = 'profile' | 'config' | 'branches' | 'departments' | 'positions' | 'leaveTypes' | 'jobTypes' | 'jobStatuses';

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('profile');
  const [saved, setSaved] = useState(false);
  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: config,  isLoading: configLoading  } = useCompanyConfig();

  const [profile, setProfile] = useState({ name: '', email: '', phone: '', address: '', timezone: 'Asia/Dubai', logoUrl: '' });
  const [cfg, setCfg] = useState({ shiftStartTime: '08:00', gracePeriodEnd: '08:15', workingDays: 'Mon,Tue,Wed,Thu,Fri', maxOvertimeHours: 4, timezone: 'Asia/Dubai' });

  useEffect(() => {
    if (company) setProfile({ name: company.name || '', email: company.email || '', phone: company.phone || '', address: company.address || '', timezone: company.timezone || 'Asia/Dubai', logoUrl: company.logoUrl || '' });
  }, [company]);

  useEffect(() => {
    if (config) setCfg({ shiftStartTime: config.shiftStartTime || '08:00', gracePeriodEnd: config.gracePeriodEnd || '08:15', workingDays: config.workingDays || 'Mon,Tue,Wed,Thu,Fri', maxOvertimeHours: config.maxOvertimeHours || 4, timezone: config.timezone || 'Asia/Dubai' });
  }, [config]);

  const updateProfile = useMutation({
    mutationFn: () => apiClient.put('/company/me', { name: profile.name, email: profile.email || undefined, phone: profile.phone || undefined, address: profile.address || undefined, timezone: profile.timezone, logoUrl: profile.logoUrl || undefined }).then(r => r.data),
    onSuccess: res => { if (res.success) { qc.invalidateQueries({ queryKey: ['company'] }); showSaved(); } },
  });

  const updateConfig = useMutation({
    mutationFn: () => apiClient.put('/company/config', { ...cfg }).then(r => r.data),
    onSuccess: res => { if (res.success) { qc.invalidateQueries({ queryKey: ['company-config'] }); showSaved(); } },
  });

  const TIMEZONES = ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Kuwait', 'UTC', 'Europe/London'];
  const WORKING_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const toggleDay = (day: string) => {
    const days = cfg.workingDays.split(',').filter(Boolean);
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1); else days.push(day);
    setCfg(c => ({ ...c, workingDays: days.join(',') }));
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'profile',      label: 'Company Profile' },
    { key: 'config',       label: 'Attendance Config' },
    { key: 'branches',     label: 'Branches' },
    { key: 'departments',  label: 'Departments' },
    { key: 'positions',    label: 'Positions' },
    { key: 'leaveTypes',   label: 'Leave Types' },
    { key: 'jobTypes',     label: 'Job Types' },
    { key: 'jobStatuses',  label: 'Job Statuses' },
  ];

  if (companyLoading || configLoading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-lg bg-gray-100 animate-pulse"/>
      <div className="h-64 rounded-xl bg-gray-100 animate-pulse"/>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">Company profile, attendance config and master data</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-[13px] font-medium text-green-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Saved successfully
          </div>
        )}
      </div>

      {/* Company stats */}
      {company && (
        <div className="mb-5 grid grid-cols-3 gap-3.5">
          {[
            { label: 'Total Employees', value: company.totalEmployees },
            { label: 'Active Branches',  value: company.totalBranches  },
            { label: 'User Accounts',    value: company.totalUsers      },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-[12px] text-gray-500 mb-1">{card.label}</div>
              <div className="text-[26px] font-bold text-gray-900 tabular-nums">{card.value ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${tab === t.key ? 'bg-btn text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE ── */}
      {tab === 'profile' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-[15px] font-semibold text-gray-900">Company Profile</h2>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Company Name *">
              <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your Company LLC" className={inp}/>
            </Field>
            <Field label="Email">
              <input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="admin@company.ae" className={inp}/>
            </Field>
            <Field label="Phone">
              <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+971 4 000 0000" className={inp}/>
            </Field>
            <Field label="Timezone">
              <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className={inp}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Address">
                <input value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} placeholder="Building, Street, City, UAE" className={inp}/>
              </Field>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <SaveBtn pending={updateProfile.isPending} onClick={() => updateProfile.mutate()} label="Save Profile"/>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE CONFIG ── */}
      {tab === 'config' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-[15px] font-semibold text-gray-900">Attendance Configuration</h2>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Shift Start Time">
              <input type="time" value={cfg.shiftStartTime} onChange={e => setCfg(c => ({ ...c, shiftStartTime: e.target.value }))} className={inp}/>
              <p className="mt-1 text-[11px] text-gray-400">Check-ins after grace period are marked Late</p>
            </Field>
            <Field label="Grace Period End">
              <input type="time" value={cfg.gracePeriodEnd} onChange={e => setCfg(c => ({ ...c, gracePeriodEnd: e.target.value }))} className={inp}/>
              <p className="mt-1 text-[11px] text-gray-400">Check-ins before this time are Present</p>
            </Field>
            <Field label="Max Overtime Hours / Day">
              <input type="number" min={1} max={24} value={cfg.maxOvertimeHours} onChange={e => setCfg(c => ({ ...c, maxOvertimeHours: Number(e.target.value) }))} className={inp}/>
            </Field>
            <div className="col-span-2">
              <label className="mb-2 block text-[13px] font-medium text-gray-700">Working Days</label>
              <div className="flex gap-2 flex-wrap">
                {WORKING_DAYS.map(day => {
                  const active = cfg.workingDays.split(',').includes(day);
                  return (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors ${active ? 'border-blue-600 bg-btn text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <SaveBtn pending={updateConfig.isPending} onClick={() => updateConfig.mutate()} label="Save Configuration"/>
          </div>
        </div>
      )}

      {/* ── MASTER DATA TABS ── */}
      {tab === 'branches'    && <OrgCrudPanel resource="branches"    label="Branch"      fields={branchFields}    />}
      {tab === 'departments' && <OrgCrudPanel resource="departments" label="Department"  fields={deptFields}      />}
      {tab === 'positions'   && <OrgCrudPanel resource="positions"   label="Position"    fields={posFields}       />}
      {tab === 'leaveTypes'  && <MasterCrudPanel resource="leave-types"  label="Leave Type"  fields={leaveTypeFields} />}
      {tab === 'jobTypes'    && <MasterCrudPanel resource="job-types"    label="Job Type"    fields={jobTypeFields}   />}
      {tab === 'jobStatuses' && <MasterCrudPanel resource="job-statuses" label="Job Status"  fields={jobStatusFields} />}
    </div>
  );
}

// ── Field definitions ─────────────────────────────────────────────────────────

const branchFields = [
  { key: 'name',    label: 'Branch Name *',  type: 'text',   required: true  },
  { key: 'address', label: 'Address',         type: 'text',   required: false },
];
const deptFields = [
  { key: 'name', label: 'Department Name *', type: 'text', required: true },
];
const posFields = [
  { key: 'name',        label: 'Position Name *',  type: 'text', required: true  },
  { key: 'description', label: 'Description',       type: 'text', required: false },
];
const leaveTypeFields = [
  { key: 'name',           label: 'Type Name *',       type: 'text',     required: true  },
  { key: 'maxDaysPerYear', label: 'Max Days / Year',   type: 'number',   required: false },
  { key: 'isPaid',         label: 'Is Paid',           type: 'checkbox', required: false },
];
// Duration type: stored as total minutes, displayed as Days + Hours inputs
const jobTypeFields = [
  { key: 'name',                  label: 'Type Name *',   type: 'text',     required: true  },
  { key: 'estimatedDurationMins', label: 'Est. Duration', type: 'duration', required: false },
];
const jobStatusFields = [
  { key: 'name',         label: 'Status Name *',  type: 'text',   required: true  },
  { key: 'colorCode',    label: 'Color Code',     type: 'color',  required: false },
  { key: 'displayOrder', label: 'Display Order',  type: 'number', required: false },
];

type FieldDef = { key: string; label: string; type: string; required: boolean };

/** Convert total minutes → human-readable string e.g. "2d 3h" */
function formatDuration(mins: number): string {
  if (!mins || mins <= 0) return '—';
  const d = Math.floor(mins / (24 * 60));
  const h = Math.floor((mins % (24 * 60)) / 60);
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  return `${mins}min`;
}

// ── Generic CRUD panel for /api/org/* ─────────────────────────────────────────

function OrgCrudPanel({ resource, label, fields }: { resource: string; label: string; fields: FieldDef[] }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useOrgList(resource);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const openAdd = () => {
    const empty: Record<string, any> = {};
    fields.forEach(f => { empty[f.key] = f.type === 'checkbox' ? false : (f.type === 'number' || f.type === 'duration') ? 0 : ''; });
    setForm(empty); setShowAdd(true); setEditItem(null);
  };

  const openEdit = (item: any) => {
    const prefilled: Record<string, any> = {};
    fields.forEach(f => { prefilled[f.key] = item[f.key] ?? (f.type === 'checkbox' ? false : (f.type === 'number' || f.type === 'duration') ? 0 : ''); });
    prefilled.isActive = item.isActive ?? true;
    setForm(prefilled); setEditItem(item); setShowAdd(false);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editItem) {
        await apiClient.put(`/org/${resource}/${editItem.id}`, { ...form, isActive: form.isActive ?? true });
      } else {
        await apiClient.post(`/org/${resource}`, form);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org', resource] });
      qc.invalidateQueries({ queryKey: ['lookups'] });
      setShowAdd(false); setEditItem(null);
    },
  });

  // onDeactivate returns a Promise so CrudPanel can await it and handle loading/error
  const handleDeactivate = async (id: string): Promise<void> => {
    await apiClient.delete(`/org/${resource}/${id}`);
    await qc.invalidateQueries({ queryKey: ['org', resource] });
    await qc.invalidateQueries({ queryKey: ['lookups'] });
  };

  return (
    <CrudPanel
      label={label} items={items} isLoading={isLoading}
      showAdd={showAdd} editItem={editItem} form={form} fields={fields}
      onOpenAdd={openAdd} onOpenEdit={openEdit} onFormChange={(k, v) => setForm(f => ({ ...f, [k]: v }))}
      onSave={() => save.mutate()} onDeactivate={handleDeactivate}
      onCancel={() => { setShowAdd(false); setEditItem(null); }}
      isSaving={save.isPending}
    />
  );
}

// ── Generic CRUD panel for /api/master/* ──────────────────────────────────────

function MasterCrudPanel({ resource, label, fields }: { resource: string; label: string; fields: FieldDef[] }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useMasterList(resource);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const openAdd = () => {
    const empty: Record<string, any> = {};
    fields.forEach(f => { empty[f.key] = f.type === 'checkbox' ? false : (f.type === 'number' || f.type === 'duration') ? 0 : ''; });
    setForm(empty); setShowAdd(true); setEditItem(null);
  };

  const openEdit = (item: any) => {
    const prefilled: Record<string, any> = {};
    fields.forEach(f => { prefilled[f.key] = item[f.key] ?? (f.type === 'checkbox' ? false : (f.type === 'number' || f.type === 'duration') ? 0 : ''); });
    prefilled.isActive = item.isActive ?? true;
    setForm(prefilled); setEditItem(item); setShowAdd(false);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editItem) {
        await apiClient.put(`/master/${resource}/${editItem.id}`, { ...form, isActive: form.isActive ?? true });
      } else {
        await apiClient.post(`/master/${resource}`, form);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master', resource] });
      qc.invalidateQueries({ queryKey: ['lookups'] });
      setShowAdd(false); setEditItem(null);
    },
  });

  // onDeactivate returns a Promise so CrudPanel can await it and handle loading/error
  const handleDeactivate = async (id: string): Promise<void> => {
    await apiClient.delete(`/master/${resource}/${id}`);
    await qc.invalidateQueries({ queryKey: ['master', resource] });
    await qc.invalidateQueries({ queryKey: ['lookups'] });
  };

  return (
    <CrudPanel
      label={label} items={items} isLoading={isLoading}
      showAdd={showAdd} editItem={editItem} form={form} fields={fields}
      onOpenAdd={openAdd} onOpenEdit={openEdit} onFormChange={(k, v) => setForm(f => ({ ...f, [k]: v }))}
      onSave={() => save.mutate()} onDeactivate={handleDeactivate}
      onCancel={() => { setShowAdd(false); setEditItem(null); }}
      isSaving={save.isPending}
    />
  );
}

// ── Shared CRUD panel UI ──────────────────────────────────────────────────────

function CrudPanel({
  label, items, isLoading, showAdd, editItem, form, fields,
  onOpenAdd, onOpenEdit, onFormChange, onSave, onDeactivate, onCancel, isSaving,
}: {
  label: string; items: any[]; isLoading: boolean; showAdd: boolean; editItem: any | null;
  form: Record<string, any>; fields: FieldDef[];
  onOpenAdd: () => void; onOpenEdit: (item: any) => void;
  onFormChange: (key: string, value: any) => void;
  onSave: () => void;
  // Async — CrudPanel awaits this to drive loading state and error feedback
  onDeactivate: (id: string) => Promise<void>;
  onCancel: () => void; isSaving: boolean;
}) {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const handleDeactivateRequest = (id: string, name: string) => {
    setDeactivateError(null);
    setConfirmDialog({
      title: `Deactivate ${label}`,
      message: `Are you sure you want to deactivate "${name}"? It will no longer be available for selection. You can reactivate it later via the Edit option.`,
      confirmLabel: 'Deactivate',
      confirmCls: 'bg-red-600 hover:bg-red-700',
      onConfirm: () => {
        setIsDeactivating(true);
        setDeactivateError(null);
        onDeactivate(id)
          .then(() => {
            setIsDeactivating(false);
            setConfirmDialog(null);
          })
          .catch((err: any) => {
            setIsDeactivating(false);
            setConfirmDialog(null); // close dialog so the error banner is visible
            // The response interceptor rejects with err.response.data (already the body)
            const msg =
              err?.message ||
              (typeof err === 'string' ? err : null) ||
              'Failed to deactivate. Please try again.';
            setDeactivateError(msg);
          });
      },
    });
  };

  const activeItems = (items as any[]).filter(i => i.isActive !== false);
  const inactiveItems = (items as any[]).filter(i => i.isActive === false);

  return (
    <>
      {/* App-theme confirm dialog — stays open while deactivating, shows loading spinner */}
      <ConfirmDialog
        state={confirmDialog}
        onClose={() => {
          if (!isDeactivating) {
            setConfirmDialog(null);
            setDeactivateError(null);
          }
        }}
        isLoading={isDeactivating}
      />

      {/* Error banner shown below the panel when deactivation fails */}
      {deactivateError && (
        <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" className="mt-0.5 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-red-800">Deactivation failed</p>
            <p className="text-[12px] text-red-600 mt-0.5">{deactivateError}</p>
          </div>
          <button onClick={() => setDeactivateError(null)} className="text-red-400 hover:text-red-600">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <div className="text-[15px] font-semibold text-gray-900">{label}s</div>
            <div className="text-[12px] text-gray-500 mt-0.5">{activeItems.length} active</div>
          </div>
          <button onClick={onOpenAdd}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-btn px-4 text-[13px] font-semibold text-white hover:bg-btn-hover transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add {label}
          </button>
        </div>

        {/* Add / Edit form */}
        {(showAdd || editItem) && (
          <div className="border-b border-gray-100 bg-blue-50/40 px-5 py-4">
            <div className="text-[13px] font-semibold text-gray-800 mb-3">
              {editItem ? `Edit ${label}` : `New ${label}`}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {fields.map(f => (
                <div key={f.key} className={
                  f.type === 'checkbox' ? 'flex items-center gap-2 col-span-1'
                  : f.type === 'duration' ? 'col-span-2'
                  : 'col-span-1'
                }>
                  {f.type === 'checkbox' ? (
                    <>
                      <input type="checkbox" id={f.key} checked={!!form[f.key]}
                        onChange={e => onFormChange(f.key, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"/>
                      <label htmlFor={f.key} className="text-[13px] font-medium text-gray-700">{f.label}</label>
                    </>
                  ) : f.type === 'color' ? (
                    <div>
                      <label className="mb-1.5 block text-[12px] font-medium text-gray-600">{f.label}</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form[f.key] || '#94a3b8'}
                          onChange={e => onFormChange(f.key, e.target.value)}
                          className="h-9 w-12 cursor-pointer rounded border border-gray-200"/>
                        <span className="text-[12px] font-mono text-gray-500">{form[f.key] || '#94a3b8'}</span>
                      </div>
                    </div>
                  ) : f.type === 'duration' ? (
                    // Days + Hours split input — stores total minutes internally
                    <div>
                      <label className="mb-1.5 block text-[12px] font-medium text-gray-600">{f.label}</label>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const totalMins = Number(form[f.key]) || 0;
                          const dDays = Math.floor(totalMins / (24 * 60));
                          const dHours = Math.floor((totalMins % (24 * 60)) / 60);
                          return (
                            <>
                              <input type="number" min={0} value={dDays}
                                onChange={e => {
                                  const nd = Math.max(0, Number(e.target.value) || 0);
                                  onFormChange(f.key, nd * 24 * 60 + dHours * 60);
                                }}
                                className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
                              />
                              <span className="text-[12px] font-medium text-gray-500">Days</span>
                              <input type="number" min={0} max={23} value={dHours}
                                onChange={e => {
                                  const nh = Math.max(0, Math.min(23, Number(e.target.value) || 0));
                                  onFormChange(f.key, dDays * 24 * 60 + nh * 60);
                                }}
                                className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
                              />
                              <span className="text-[12px] font-medium text-gray-500">Hours</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-[12px] font-medium text-gray-600">{f.label}</label>
                      <input
                        type={f.type === 'number' ? 'number' : 'text'}
                        value={form[f.key] ?? ''}
                        onChange={e => onFormChange(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                        className={inp}/>
                    </div>
                  )}
                </div>
              ))}
              {editItem && (
                <div className="flex items-center gap-2 col-span-1">
                  <input type="checkbox" id="isActive" checked={!!form.isActive}
                    onChange={e => onFormChange('isActive', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"/>
                  <label htmlFor="isActive" className="text-[13px] font-medium text-gray-700">Active</label>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={onCancel}
                className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={onSave} disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-btn px-4 py-2 text-[13px] font-semibold text-white hover:bg-btn-hover disabled:opacity-70 transition-colors">
                {isSaving && <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {editItem ? 'Save Changes' : `Create ${label}`}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="h-4 w-48 rounded bg-gray-100 animate-pulse"/>
                <div className="ml-auto h-6 w-16 rounded-full bg-gray-100 animate-pulse"/>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-gray-400">No {label.toLowerCase()}s yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activeItems.map((item: any) => (
              <ItemRow key={item.id} item={item} fields={fields}
                onEdit={onOpenEdit} onDeactivateRequest={handleDeactivateRequest}/>
            ))}
            {inactiveItems.length > 0 && (
              <>
                <div className="bg-gray-50 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Inactive
                </div>
                {inactiveItems.map((item: any) => (
                  <ItemRow key={item.id} item={item} fields={fields}
                    onEdit={onOpenEdit} onDeactivateRequest={handleDeactivateRequest} inactive/>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function ItemRow({ item, fields, onEdit, onDeactivateRequest, inactive = false }: {
  item: any; fields: FieldDef[]; onEdit: (i: any) => void;
  onDeactivateRequest: (id: string, name: string) => void; inactive?: boolean;
}) {
  const primaryField = fields[0];
  const secondaryFields = fields.slice(1);

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 group hover:bg-gray-50/50 transition-colors ${inactive ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-gray-900">
          {item[primaryField.key] || '—'}
          {item.colorCode && (
            <span className="ml-2 inline-block h-3 w-3 rounded-full border border-gray-200" style={{ background: item.colorCode }}/>
          )}
        </div>
        {secondaryFields.length > 0 && (
          <div className="mt-0.5 flex items-center gap-3">
            {secondaryFields.map(f => {
              if (f.type === 'checkbox' || f.key === 'colorCode') return null;
              const val = item[f.key];
              if (!val && val !== 0 && val !== false) return null;
              const displayVal = f.type === 'duration'
                ? formatDuration(Number(val))
                : typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val;
              return (
                <span key={f.key} className="text-[11px] text-gray-400">
                  {f.label.replace(' *','')}: {displayVal}
                </span>
              );
            })}
            {item.isPaid !== undefined && (
              <span className={`rounded-full px-2 py-px text-[10px] font-medium ${item.isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {item.isPaid ? 'Paid' : 'Unpaid'}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(item)}
          className="rounded-md px-2.5 py-1 text-[12px] font-medium text-blue-600 hover:bg-blue-50 transition-colors">
          Edit
        </button>
        {!inactive && (
          <button
            onClick={() => onDeactivateRequest(item.id, item[primaryField.key] || 'this item')}
            className="rounded-md px-2.5 py-1 text-[12px] font-medium text-red-500 hover:bg-red-50 transition-colors">
            Deactivate
          </button>
        )}
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const inp = 'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function SaveBtn({ pending, onClick, label }: { pending: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} disabled={pending}
      className="flex h-9 items-center gap-2 rounded-lg bg-btn px-5 text-[13px] font-semibold text-white hover:bg-btn-hover disabled:opacity-70 transition-colors">
      {pending && <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
      {label}
    </button>
  );
}
