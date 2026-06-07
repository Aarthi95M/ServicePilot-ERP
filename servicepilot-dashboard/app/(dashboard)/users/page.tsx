'use client';
// app/(dashboard)/users/page.tsx
// User management — list, create, edit, reset password, deactivate

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLookups } from '@/lib/hooks/useLookups';
import apiClient from '@/lib/api/client';
import { useTableSort, thCls, SortArrow } from '@/lib/hooks/useTableSort';
import { useToast } from '@/components/shared/ToastProvider';
import { ConfirmDialog, type ConfirmDialogState } from '@/components/shared/ConfirmDialog';

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => { const r = await apiClient.get('/users'); return r.data.data; },
    staleTime: 30 * 1000,
  });
}

const ROLE_CONFIG: Record<string, { cls: string }> = {
  Admin:      { cls: 'bg-purple-100 text-purple-700' },
  HRManager:  { cls: 'bg-blue-100 text-blue-700'    },
  Supervisor: { cls: 'bg-teal-100 text-teal-700'    },
  Dispatcher: { cls: 'bg-amber-100 text-amber-700'  },
  Technician: { cls: 'bg-gray-100 text-gray-600'    },
};

const ROLES = ['Admin','HRManager','Supervisor','Dispatcher','Technician'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UsersPage() {
  const qc = useQueryClient();
  const { data: users, isLoading, isError } = useUsers();
  const { data: lookups } = useLookups();

  // No default sort key — no column is pre-selected, list shows in server order
  const { sorted: filteredUsers, search, setSearch, sortKey, sortDir, toggleSort } = useTableSort(users ?? [], '');

  const { showToast } = useToast();

  // ── Confirm dialog for deactivate ──────────────────────────────────────────
  const [deactivateDialog, setDeactivateDialog] = useState<ConfirmDialogState | null>(null);

  // ── Create modal ───────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phoneNumber: '', role: 'Technician',
    branchId: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Edit modal ─────────────────────────────────────────────────────────────
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '', phoneNumber: '', role: 'Technician', branchId: '', isActive: true,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // ── Reset password modal ───────────────────────────────────────────────────
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createUser = useMutation({
    mutationFn: (dto: any) => apiClient.post('/users', dto).then(r => r.data),
    onSuccess: (res) => {
      if (res.success) {
        qc.invalidateQueries({ queryKey: ['users'] });
        setShowCreate(false);
        setForm({ fullName: '', email: '', phoneNumber: '', role: 'Technician', branchId: '', password: '', confirmPassword: '' });
        setErrors({});
        showToast('User created successfully', 'success');
      } else {
        showToast(res.message || 'Failed to create user', 'error');
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to create user';
      showToast(msg, 'error');
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) =>
      apiClient.put(`/users/${id}`, dto).then(r => r.data),
    onSuccess: (res) => {
      if (res.success) {
        qc.invalidateQueries({ queryKey: ['users'] });
        setEditUser(null);
        setEditErrors({});
        showToast('User updated successfully', 'success');
      } else {
        showToast(res.message || 'Failed to update user', 'error');
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to update user';
      showToast(msg, 'error');
    },
  });

  const deactivateUser = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`).then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      showToast(res.success ? 'User deactivated' : (res.message || 'Failed'), res.success ? 'success' : 'error');
    },
    onError: (err: any) => showToast(err?.message || 'Failed to deactivate user', 'error'),
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, pwd }: { id: string; pwd: string }) =>
      apiClient.put(`/users/${id}/reset-password`, { newPassword: pwd }).then(r => r.data),
    onSuccess: (res) => {
      if (res.success) {
        setResetUserId(null);
        setNewPassword('');
        showToast('Password reset successfully', 'success');
      } else {
        showToast(res.message || 'Failed to reset password', 'error');
      }
    },
    onError: (err: any) => showToast(err?.message || 'Failed to reset password', 'error'),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!EMAIL_RE.test(form.email.trim())) {
      errs.email = 'Enter a valid email address';
    }
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (form.password && form.confirmPassword !== form.password) {
      errs.confirmPassword = 'Passwords do not match';
    }
    if (['Supervisor','Technician'].includes(form.role) && !form.branchId) {
      errs.branchId = 'Branch is required for this role';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    createUser.mutate({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      role: form.role,
      branchId: form.branchId || undefined,
      password: form.password,
    });
  };

  const handleOpenEdit = (u: any) => {
    setEditForm({
      fullName: u.fullName || '',
      phoneNumber: u.phoneNumber || '',
      role: u.role || 'Technician',
      branchId: u.branchId || '',
      isActive: u.isActive ?? true,
    });
    setEditErrors({});
    setEditUser(u);
  };

  const handleUpdate = () => {
    const errs: Record<string, string> = {};
    if (!editForm.fullName.trim()) errs.fullName = 'Full name is required';
    if (['Supervisor','Technician'].includes(editForm.role) && !editForm.branchId) {
      errs.branchId = 'Branch is required for this role';
    }
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;
    updateUser.mutate({
      id: editUser.id,
      dto: {
        fullName: editForm.fullName.trim(),
        phoneNumber: editForm.phoneNumber.trim() || undefined,
        role: editForm.role,
        branchId: editForm.branchId || undefined,
        isActive: editForm.isActive,
      },
    });
  };

  const handleDeactivateClick = (u: any) => {
    setDeactivateDialog({
      title: 'Deactivate User',
      message: `Are you sure you want to deactivate ${u.fullName}? They will lose access to the system immediately. This action can be reversed by editing the user.`,
      confirmLabel: 'Deactivate',
      confirmCls: 'bg-red-600 hover:bg-red-700',
      onConfirm: () => {
        deactivateUser.mutate(u.id, {
          onSuccess: () => setDeactivateDialog(null),
          onError: () => setDeactivateDialog(null),
        });
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* App-theme confirm dialog for deactivation */}
      <ConfirmDialog
        state={deactivateDialog}
        onClose={() => setDeactivateDialog(null)}
        isLoading={deactivateUser.isPending}
      />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Users</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">Manage user accounts and access</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex h-9 items-center gap-1.5 rounded-lg bg-btn px-4 text-[13px] font-semibold text-white hover:bg-btn-hover transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add User
        </button>
      </div>

      {isError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-[13px] text-red-700">
          Failed to load users. Check your connection and try refreshing the page.
        </div>
      )}

      {/* Search bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 flex-1 max-w-sm items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or role..."
            className="flex-1 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <span className="text-[12px] text-gray-400">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading && <TableSkeleton />}
        {!isLoading && users && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th onClick={() => toggleSort('fullName')} className={thCls(sortKey, 'fullName', sortDir)}>
                  User <SortArrow col="fullName" sortKey={sortKey} sortDir={sortDir}/>
                </th>
                <th onClick={() => toggleSort('role')} className={thCls(sortKey, 'role', sortDir)}>
                  Role <SortArrow col="role" sortKey={sortKey} sortDir={sortDir}/>
                </th>
                <th onClick={() => toggleSort('branchName')} className={thCls(sortKey, 'branchName', sortDir)}>
                  Branch <SortArrow col="branchName" sortKey={sortKey} sortDir={sortDir}/>
                </th>
                <th onClick={() => toggleSort('lastLoginAt')} className={thCls(sortKey, 'lastLoginAt', sortDir)}>
                  Last Login <SortArrow col="lastLoginAt" sortKey={sortKey} sortDir={sortDir}/>
                </th>
                <th onClick={() => toggleSort('isActive')} className={thCls(sortKey, 'isActive', sortDir)}>
                  Status <SortArrow col="isActive" sortKey={sortKey} sortDir={sortDir}/>
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-[13px] text-gray-400">No users match your search</td></tr>
              )}
              {filteredUsers.map((u: any) => {
                const initials = u.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??';
                const colors = ['#0d9488','#2563eb','#7c3aed','#d97706','#dc2626'];
                const color = colors[(u.fullName?.length ?? 0) % colors.length];
                return (
                  <tr key={u.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: color }}>{initials}</div>
                        <div>
                          <div className="text-[13px] font-medium text-gray-900">{u.fullName}</div>
                          <div className="text-[11px] text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${ROLE_CONFIG[u.role]?.cls || 'bg-gray-100 text-gray-500'}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-700">{u.branchName || '—'}</td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-GB') : 'Never'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(u)} className="rounded-md px-2.5 py-1 text-[12px] font-medium text-gray-600 hover:bg-gray-100 transition-colors">Edit</button>
                        <button onClick={() => setResetUserId(u.id)} className="rounded-md px-2.5 py-1 text-[12px] font-medium text-blue-600 hover:bg-blue-50 transition-colors">Reset PWD</button>
                        {u.isActive && (
                          <button
                            onClick={() => handleDeactivateClick(u)}
                            className="rounded-md px-2.5 py-1 text-[12px] font-medium text-red-500 hover:bg-red-50 transition-colors">
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!isLoading && users?.length === 0 && (
          <div className="py-16 text-center text-[13px] text-gray-400">No users found</div>
        )}
      </div>

      {/* ── Create user modal ── */}
      {showCreate && (
        <Modal title="Add New User" onClose={() => { setShowCreate(false); setErrors({}); }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name *" error={errors.fullName}>
                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Ahmed Mohammed" className={inp(!!errors.fullName)} autoComplete="off"/>
              </Field>
              <Field label="Email *" error={errors.email}>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ahmed@company.ae" className={inp(!!errors.email)} autoComplete="off"/>
              </Field>
              <Field label="Phone">
                <input type="tel" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="+971 50 000 0000" className={inp(false)} autoComplete="tel"/>
              </Field>
              <Field label="Role">
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inp(false)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              {['Supervisor','Technician'].includes(form.role) && (
                <Field label="Branch *" error={errors.branchId}>
                  <select value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))} className={inp(!!errors.branchId)}>
                    <option value="">Select branch...</option>
                    {(lookups?.branches || []).map((b: any) => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Password *" error={errors.password}>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" className={inp(!!errors.password)} autoComplete="new-password"/>
              </Field>
              <Field label="Confirm Password *" error={errors.confirmPassword}>
                <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat password" className={inp(!!errors.confirmPassword)} autoComplete="new-password"/>
              </Field>
            </div>
            {createUser.isError && (
              <p className="text-[12px] text-red-600">Failed to create user. Please try again.</p>
            )}
            <div className="flex justify-end gap-2.5 pt-2">
              <button onClick={() => { setShowCreate(false); setErrors({}); }} className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={createUser.isPending} className="flex items-center gap-2 rounded-lg bg-btn px-4 py-2 text-[13px] font-semibold text-white hover:bg-btn-hover disabled:opacity-70">
                {createUser.isPending && <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                Create User
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit user modal ── */}
      {editUser && (
        <Modal title="Edit User" onClose={() => { setEditUser(null); setEditErrors({}); }}>
          <div className="space-y-4">
            {/* Email is read-only — it's the login identifier */}
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-2.5">
              <div className="text-[11px] font-medium text-gray-400 mb-0.5">Login Email (cannot be changed)</div>
              <div className="text-[13px] font-medium text-gray-700">{editUser.email}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name *" error={editErrors.fullName}>
                <input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Ahmed Mohammed" className={inp(!!editErrors.fullName)} autoComplete="off"/>
              </Field>
              <Field label="Phone">
                <input type="tel" value={editForm.phoneNumber} onChange={e => setEditForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="+971 50 000 0000" className={inp(false)} autoComplete="tel"/>
              </Field>
              <Field label="Role">
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className={inp(false)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              {['Supervisor','Technician'].includes(editForm.role) && (
                <Field label="Branch *" error={editErrors.branchId}>
                  <select value={editForm.branchId} onChange={e => setEditForm(f => ({ ...f, branchId: e.target.value }))} className={inp(!!editErrors.branchId)}>
                    <option value="">Select branch...</option>
                    {(lookups?.branches || []).map((b: any) => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </Field>
              )}
              <div className="flex items-center gap-2 col-span-1 pt-5">
                <input type="checkbox" id="editIsActive" checked={editForm.isActive}
                  onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"/>
                <label htmlFor="editIsActive" className="text-[13px] font-medium text-gray-700">Account active</label>
              </div>
            </div>
            {updateUser.isError && (
              <p className="text-[12px] text-red-600">Failed to update user. Please try again.</p>
            )}
            <div className="flex justify-end gap-2.5 pt-2">
              <button onClick={() => { setEditUser(null); setEditErrors({}); }} className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdate} disabled={updateUser.isPending} className="flex items-center gap-2 rounded-lg bg-btn px-4 py-2 text-[13px] font-semibold text-white hover:bg-btn-hover disabled:opacity-70">
                {updateUser.isPending && <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reset password modal ── */}
      {resetUserId && (
        <Modal title="Reset Password" onClose={() => { setResetUserId(null); setNewPassword(''); }}>
          <div className="space-y-4">
            <Field label="New Password">
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" className={inp(false)} autoComplete="new-password"/>
            </Field>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setResetUserId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => resetPassword.mutate({ id: resetUserId, pwd: newPassword })} disabled={newPassword.length < 8 || resetPassword.isPending}
                className="rounded-lg bg-btn px-4 py-2 text-[13px] font-semibold text-white hover:bg-btn-hover disabled:opacity-70">
                Reset Password
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inp = (err: boolean) => `w-full rounded-lg border ${err ? 'border-red-400' : 'border-gray-200'} bg-white px-3.5 py-2.5 text-[13px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors`;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-gray-600">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-50">
      {[1,2,3,4].map(i => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse"/>
          <div className="flex-1 space-y-2"><div className="h-3.5 w-32 rounded bg-gray-100 animate-pulse"/><div className="h-3 w-24 rounded bg-gray-100 animate-pulse"/></div>
          <div className="h-6 w-20 rounded-full bg-gray-100 animate-pulse"/>
        </div>
      ))}
    </div>
  );
}
