'use client';
// app/(dashboard)/admin/page.tsx
// SuperAdmin company management UI.
// All calls to /api/superadmin/* require the X-Api-Key header.
// The API key is entered once per session and stored only in React state
// (never in localStorage/cookies — it's an operator secret).

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { useToast } from '@/components/shared/ToastProvider';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Company {
  companyId: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  timezone: string;
  isActive: boolean;
  userCount: number;
  employeeCount: number;
  createdAt: string;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useCompanies(apiKey: string) {
  return useQuery<Company[]>({
    queryKey: ['superadmin-companies', apiKey],
    queryFn: async () => {
      const res = await apiClient.get('/superadmin/companies', {
        headers: { 'X-Api-Key': apiKey },
      });
      return res.data.data ?? [];
    },
    enabled: !!apiKey,
    retry: false,
  });
}

function useOnboardCompany(apiKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      companyName: string;
      companyEmail: string;
      companyPhone: string;
      timezone: string;
      adminFullName: string;
      adminEmail: string;
      adminPassword: string;
    }) => {
      const res = await apiClient.post('/superadmin/onboard', dto, {
        headers: { 'X-Api-Key': apiKey },
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin-companies'] }),
  });
}

function useDeactivate(apiKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const res = await apiClient.put(
        `/superadmin/${companyId}/deactivate`,
        {},
        { headers: { 'X-Api-Key': apiKey } }
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin-companies'] }),
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { showToast } = useToast();
  const [apiKey, setApiKey]           = useState('');
  const [submittedKey, setSubmittedKey] = useState('');
  const [showOnboard, setShowOnboard] = useState(false);

  const { data: companies = [], isLoading, error } = useCompanies(submittedKey);
  const onboard    = useOnboardCompany(submittedKey);
  const deactivate = useDeactivate(submittedKey);

  // ── Onboard form state ────────────────────────────────────────────────────
  const emptyForm = {
    companyName: '', companyEmail: '', companyPhone: '', timezone: 'Asia/Dubai',
    adminFullName: '', adminEmail: '', adminPassword: '',
  };
  const [form, setForm] = useState(emptyForm);
  const setField = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleOnboard = (e: React.FormEvent) => {
    e.preventDefault();
    onboard.mutate(form, {
      onSuccess: res => {
        if (res.success) {
          showToast(`Company "${form.companyName}" onboarded successfully`, 'success');
          setForm(emptyForm);
          setShowOnboard(false);
        } else {
          showToast(res.message || 'Onboarding failed', 'error');
        }
      },
      onError: (err: any) => showToast(err?.response?.data?.message || 'Failed', 'error'),
    });
  };

  const handleDeactivate = (c: Company) => {
    if (!confirm(`Deactivate "${c.companyName}"? This disables all logins for this company.`)) return;
    deactivate.mutate(c.companyId, {
      onSuccess: res => {
        if (res.success) showToast(`${c.companyName} deactivated`, 'warning');
        else showToast(res.message || 'Failed', 'error');
      },
      onError: (err: any) => showToast(err?.response?.data?.message || 'Failed', 'error'),
    });
  };

  // ── API key gate ──────────────────────────────────────────────────────────
  if (!submittedKey) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="mb-1 text-[17px] font-bold text-gray-900">SuperAdmin Access</h2>
          <p className="mb-6 text-[13px] text-gray-500">
            Enter the X-Api-Key to access company management.
          </p>
          <form
            onSubmit={e => { e.preventDefault(); setSubmittedKey(apiKey); }}
            className="space-y-4"
          >
            <input
              type="password"
              required
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="X-Api-Key"
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none focus:border-purple-600 focus:ring-3 focus:ring-purple-600/10"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-purple-600 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-purple-700"
            >
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Authenticated view ────────────────────────────────────────────────────
  const isAuthError = (error as any)?.response?.status === 401;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Company Management</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">SuperAdmin · All companies on the platform</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setSubmittedKey(''); setApiKey(''); }}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Lock
          </button>
          <button
            onClick={() => setShowOnboard(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-purple-600 px-4 text-[13px] font-semibold text-white hover:bg-purple-700 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Onboard Company
          </button>
        </div>
      </div>

      {/* Auth error */}
      {isAuthError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-[13px] text-red-700">
          Invalid API key. Please lock and try again.
        </div>
      )}

      {/* Company list */}
      {!isAuthError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {isLoading && (
            <div className="divide-y divide-gray-50">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse"/>
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 rounded bg-gray-100 animate-pulse"/>
                    <div className="h-3 w-56 rounded bg-gray-100 animate-pulse"/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && companies.length === 0 && !error && (
            <div className="py-16 text-center text-[13px] text-gray-400">
              No companies onboarded yet
            </div>
          )}

          {!isLoading && companies.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Company</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Contact</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Users</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Created</th>
                  <th className="px-5 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companies.map(c => (
                  <tr key={c.companyId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-[12px] font-bold text-purple-700">
                          {c.companyName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-gray-900">{c.companyName}</div>
                          <div className="text-[11px] text-gray-400">{c.timezone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-[12px] text-gray-700">{c.email || '—'}</div>
                      <div className="text-[11px] text-gray-400">{c.phone || '—'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-[13px] text-gray-700">{c.userCount} users</div>
                      <div className="text-[11px] text-gray-400">{c.employeeCount} employees</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[12px] text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      {c.isActive && (
                        <button
                          onClick={() => handleDeactivate(c)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Onboard modal */}
      {showOnboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-gray-900">Onboard New Company</h2>
              <button onClick={() => setShowOnboard(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleOnboard} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <fieldset>
                <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Company Details</legend>
                <div className="space-y-4">
                  <Field label="Company Name *" value={form.companyName} onChange={setField('companyName')} required placeholder="TechForce Solutions LLC"/>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Email" value={form.companyEmail} onChange={setField('companyEmail')} placeholder="info@company.ae" type="email"/>
                    <Field label="Phone" value={form.companyPhone} onChange={setField('companyPhone')} placeholder="+971 4 123 4567"/>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-gray-700">Timezone</label>
                    <select
                      value={form.timezone}
                      onChange={setField('timezone')}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-purple-600"
                    >
                      <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                      <option value="Asia/Riyadh">Asia/Riyadh (UTC+3)</option>
                      <option value="Asia/Kuwait">Asia/Kuwait (UTC+3)</option>
                      <option value="Europe/London">Europe/London (UTC+0)</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">First Admin User</legend>
                <div className="space-y-4">
                  <Field label="Full Name *" value={form.adminFullName} onChange={setField('adminFullName')} required placeholder="Ahmed Al Mansoori"/>
                  <Field label="Email *" value={form.adminEmail} onChange={setField('adminEmail')} required type="email" placeholder="admin@company.ae"/>
                  <Field label="Password *" value={form.adminPassword} onChange={setField('adminPassword')} required type="password" placeholder="Min 8 characters"/>
                </div>
              </fieldset>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOnboard(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboard.isPending}
                  className="flex-1 rounded-lg bg-purple-600 py-2.5 text-[13px] font-semibold text-white hover:bg-purple-700 disabled:opacity-60 transition-colors"
                >
                  {onboard.isPending ? 'Creating...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, placeholder, type = 'text' }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-gray-700">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3.5 py-2 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-purple-600 focus:ring-3 focus:ring-purple-600/10 transition-colors"
      />
    </div>
  );
}
