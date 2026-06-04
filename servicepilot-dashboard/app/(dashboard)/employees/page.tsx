'use client';
// app/(dashboard)/employees/page.tsx — Fixed version
// Changes:
//   1. Uses ConfirmDialog instead of browser confirm()
//   2. Back navigation uses router.push not router.back()

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEmployees, useDeactivateEmployee } from '@/lib/hooks/useEmployees';
import { ConfirmDialog, type ConfirmDialogState } from '@/components/shared/ConfirmDialog';
import type { PagedEmployeeRequest, DocumentStatus } from '@/lib/types';

export default function EmployeesPage() {
  const router = useRouter();

  const [filters, setFilters] = useState<PagedEmployeeRequest>({
    page: 1, pageSize: 20, sortBy: 'fullName', sortDir: 'asc', isActive: true,
  });
  const [searchInput, setSearchInput] = useState('');

  // Confirm dialog state — null = hidden, object = shown with that config
  const [dialog, setDialog] = useState<ConfirmDialogState | null>(null);

  const { data, isLoading, isFetching, error } = useEmployees(filters);
  const deactivate = useDeactivateEmployee();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput || undefined, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateFilter = <K extends keyof PagedEmployeeRequest>(key: K, value: PagedEmployeeRequest[K]) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  // Open the custom confirm dialog — no browser confirm() anywhere
  const handleDeactivateClick = (id: string, name: string) => {
    setDialog({
      title: 'Deactivate Employee',
      message: `Are you sure you want to deactivate ${name}? They will lose access to the system immediately. This action can be reversed by editing the employee.`,
      confirmLabel: 'Deactivate',
      confirmCls: 'bg-red-600 hover:bg-red-700',
      onConfirm: () => {
        deactivate.mutate(id, {
          onSuccess: () => setDialog(null),
          onError: () => setDialog(null),
        });
      },
    });
  };

  const totalPages = data ? Math.ceil(data.totalCount / filters.pageSize) : 0;
  const currentPage = filters.page;

  return (
    <div>
      {/* Confirm dialog — only renders when dialog state is set */}
      <ConfirmDialog
        state={dialog}
        onClose={() => setDialog(null)}
        isLoading={deactivate.isPending}
      />

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Employees</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {data ? `${data.totalCount} total employees` : 'Loading...'}
          </p>
        </div>
        <Link href="/employees/new"
          className="flex h-9 items-center gap-1.5 rounded-lg bg-btn px-4 text-[13px] font-semibold text-white transition-colors hover:bg-btn-hover">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Employee
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 flex-1 max-w-[320px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 transition-all focus-within:border-blue-600 focus-within:shadow-sm focus-within:shadow-blue-600/10">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search by name, email, code..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"/>
          {searchInput && (
            <button onClick={() => { setSearchInput(''); updateFilter('search', undefined); }}
              className="text-gray-400 hover:text-gray-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        <select
          value={filters.isActive === true ? 'active' : filters.isActive === false ? 'inactive' : 'all'}
          onChange={(e) => {
            const val = e.target.value;
            updateFilter('isActive', val === 'active' ? true : val === 'inactive' ? false : undefined);
          }}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-blue-600">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>

        <select
          value={`${filters.sortBy}-${filters.sortDir}`}
          onChange={(e) => {
            const [sortBy, sortDir] = e.target.value.split('-') as [string, 'asc' | 'desc'];
            setFilters(prev => ({ ...prev, sortBy, sortDir, page: 1 }));
          }}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-blue-600">
          <option value="fullName-asc">Name A–Z</option>
          <option value="fullName-desc">Name Z–A</option>
          <option value="createdAt-desc">Newest first</option>
          <option value="createdAt-asc">Oldest first</option>
        </select>

        <select
          value={filters.pageSize}
          onChange={(e) => setFilters(prev => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-blue-600">
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>

        {isFetching && !isLoading && (
          <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Updating...
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {error && (
          <div className="px-6 py-5 text-center text-[13px] text-red-600">
            Failed to load employees. Please try again.
          </div>
        )}

        {isLoading && (
          <div className="divide-y divide-gray-50">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0"/>
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-36 rounded bg-gray-100 animate-pulse"/>
                  <div className="h-3 w-24 rounded bg-gray-100 animate-pulse"/>
                </div>
                <div className="h-3.5 w-20 rounded bg-gray-100 animate-pulse"/>
                <div className="h-3.5 w-24 rounded bg-gray-100 animate-pulse"/>
                <div className="h-6 w-16 rounded-full bg-gray-100 animate-pulse"/>
              </div>
            ))}
          </div>
        )}

        {!isLoading && data && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Employee','Code','Department','Branch','Visa','Status','Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.items.map((emp: any) => {
                const initials = emp.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                const colors = ['#0d9488','#2563eb','#7c3aed','#d97706','#dc2626'];
                const color = colors[emp.fullName.length % colors.length];

                return (
                  <tr key={emp.id} className="group transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: color }}>
                          {initials}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-gray-900">{emp.fullName}</div>
                          <div className="text-[11px] text-gray-400">{emp.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-[12px] text-gray-500">{emp.employeeCode}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-gray-700">{emp.departmentName || '—'}</td>
                    <td className="px-4 py-3.5 text-[13px] text-gray-700">{emp.branchName || '—'}</td>
                    <td className="px-4 py-3.5"><DocStatusBadge status={emp.visaStatus} /></td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${emp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Link href={`/employees/${emp.id}`}
                          className="rounded-md px-2.5 py-1 text-[12px] font-medium text-blue-600 transition-colors hover:bg-blue-50">
                          View
                        </Link>
                        <Link href={`/employees/${emp.id}/edit`}
                          className="rounded-md px-2.5 py-1 text-[12px] font-medium text-gray-500 transition-colors hover:bg-gray-100">
                          Edit
                        </Link>
                        {emp.isActive && (
                          <button
                            onClick={() => handleDeactivateClick(emp.id, emp.fullName)}
                            className="rounded-md px-2.5 py-1 text-[12px] font-medium text-red-500 transition-colors hover:bg-red-50">
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

        {!isLoading && data?.items.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="text-[14px] font-medium text-gray-700">No employees found</div>
            <div className="mt-1 text-[13px] text-gray-400">
              {searchInput ? `No results for "${searchInput}"` : 'Add your first employee to get started'}
            </div>
          </div>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5">
            <div className="text-[12px] text-gray-500">
              Showing {((currentPage - 1) * filters.pageSize) + 1}–{Math.min(currentPage * filters.pageSize, data.totalCount)} of {data.totalCount}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page = i + 1;
                if (totalPages > 5) {
                  if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                }
                return (
                  <button key={page} onClick={() => setFilters(prev => ({ ...prev, page }))}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] transition-colors ${page === currentPage ? 'bg-btn font-semibold text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocStatusBadge({ status }: { status: string | number | null | undefined }) {
  const NUMERIC_MAP: Record<number, string> = { 0: 'NotProvided', 1: 'Valid', 2: 'ExpiringSoon', 3: 'Expired' };
  const key = typeof status === 'number' ? NUMERIC_MAP[status] ?? 'NotProvided' : (typeof status === 'string' && status) ? status : 'NotProvided';
  const cfg: Record<string, { label: string; cls: string }> = {
    Valid:        { label: 'Valid',         cls: 'bg-green-100 text-green-700'  },
    ExpiringSoon: { label: 'Expiring Soon', cls: 'bg-amber-100 text-amber-700'  },
    Expired:      { label: 'Expired',       cls: 'bg-red-100 text-red-600'      },
    NotProvided:  { label: 'Not Provided',  cls: 'bg-gray-100 text-gray-500'    },
  };
  const { label, cls } = cfg[key] ?? cfg['NotProvided'];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>;
}
