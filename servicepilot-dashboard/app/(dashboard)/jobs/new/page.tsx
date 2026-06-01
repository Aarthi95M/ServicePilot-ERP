'use client';
// app/(dashboard)/jobs/new/page.tsx — with loading states + error handling

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLookups } from '@/lib/hooks/useLookups';
import { SaveButton, ApiErrorBanner, parseApiError, FormField, inputCls } from '@/components/shared';
import apiClient from '@/lib/api/client';

interface JobFormData {
  customerName: string; customerPhone: string; address: string;
  jobTypeId: string; jobStatusId: string; assignedEmployeeId: string;
  priority: string; scheduledAt: string; notes: string;
}

const EMPTY: JobFormData = {
  customerName: '', customerPhone: '', address: '',
  jobTypeId: '', jobStatusId: '', assignedEmployeeId: '',
  priority: '3', scheduledAt: '', notes: '',
};

const PRIORITIES = [
  { value: '1', label: 'Critical', cls: 'bg-red-100 text-red-700 border-red-200'    },
  { value: '2', label: 'High',     cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: '3', label: 'Medium',   cls: 'bg-blue-100 text-blue-700 border-blue-200'  },
  { value: '4', label: 'Low',      cls: 'bg-gray-100 text-gray-500 border-gray-200'  },
];

export default function JobFormPage({ isEdit = false }: { isEdit?: boolean }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const id = isEdit ? params?.id : null;

  const [form, setForm] = useState<JobFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: lookups } = useLookups();
  const { data: employees } = useQuery({
    queryKey: ['employee-lookup'],
    queryFn: async () => { const r = await apiClient.get('/lookups/employees'); return r.data.data || []; },
    staleTime: 5 * 60 * 1000,
  });
  const { data: existingJob } = useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => { const r = await apiClient.get(`/jobs/${id}`); return r.data.data; },
    enabled: !!id,
  });

  useEffect(() => {
    if (existingJob) {
      setForm({
        customerName:       existingJob.customerName || '',
        customerPhone:      existingJob.customerPhone || '',
        address:            existingJob.address || '',
        jobTypeId:          existingJob.jobTypeId || '',
        jobStatusId:        existingJob.jobStatusId || '',
        assignedEmployeeId: existingJob.assignedEmployeeId || '',
        priority:           String(existingJob.priority || 3),
        scheduledAt:        existingJob.scheduledAt ? existingJob.scheduledAt.slice(0, 16) : '',
        notes:              existingJob.notes || '',
      });
    }
  }, [existingJob]);

  const set = (field: keyof JobFormData, value: string) => {
    setForm(p => ({ ...p, [field]: value }));
    setErrors(p => ({ ...p, [field]: undefined }));
    setApiError(null);
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.customerName.trim()) errs.customerName = 'Customer name is required.';
    if (!form.jobTypeId) errs.jobTypeId = 'Please select a job type.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: (dto: any) => apiClient.post('/jobs', dto).then(r => r.data),
    onSuccess: (res) => {
      if (res.success) { qc.invalidateQueries({ queryKey: ['jobs'] }); router.push(`/jobs/${res.data?.id}`); }
      else setApiError(res.message || 'Failed to create job.');
    },
    onError: (err: any) => setApiError(parseApiError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (dto: any) => apiClient.put(`/jobs/${id}`, dto).then(r => r.data),
    onSuccess: (res) => {
      if (res.success) { qc.invalidateQueries({ queryKey: ['jobs'] }); router.push(`/jobs/${id}`); }
      else setApiError(res.message || 'Failed to update job.');
    },
    onError: (err: any) => setApiError(parseApiError(err)),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError(null);
    const dto = {
      customerName:       form.customerName.trim(),
      customerPhone:      form.customerPhone || undefined,
      address:            form.address || undefined,
      jobTypeId:          form.jobTypeId,
      jobStatusId:        form.jobStatusId || undefined,
      assignedEmployeeId: form.assignedEmployeeId || undefined,
      priority:           Number(form.priority),
      scheduledAt:        form.scheduledAt ? (form.scheduledAt.length === 16 ? form.scheduledAt + ':00' : form.scheduledAt): undefined,
      notes:              form.notes || undefined,
    };
    isEdit && id ? updateMutation.mutate(dto) : createMutation.mutate(dto);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => router.push(isEdit ? `/jobs/${id}` : '/jobs')}
        className="mb-5 flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-700 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        {isEdit ? 'Back to Job' : 'Back to Jobs'}
      </button>

      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">{isEdit ? 'Edit Job' : 'Create New Job'}</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">{isEdit ? 'Update job details below.' : 'Fill in the job details below.'}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <ApiErrorBanner error={apiError} onDismiss={() => setApiError(null)} />

          {/* Priority */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-gray-700">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button key={p.value} type="button" onClick={() => set('priority', p.value)}
                  className={`flex-1 rounded-lg border py-2 text-[12px] font-semibold transition-all ${form.priority === p.value ? p.cls : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Customer Name *" error={errors.customerName}>
              <input value={form.customerName} onChange={e => set('customerName', e.target.value)} placeholder="Mohammed Al Rashid" className={inputCls(!!errors.customerName)}/>
            </FormField>
            <FormField label="Customer Phone">
              <input value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} placeholder="+971 50 000 0000" className={inputCls(false)}/>
            </FormField>
          </div>

          <FormField label="Address">
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Villa 42, Jumeirah 1, Dubai" className={inputCls(false)}/>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Job Type *" error={errors.jobTypeId}>
              <select value={form.jobTypeId} onChange={e => set('jobTypeId', e.target.value)} className={inputCls(!!errors.jobTypeId)}>
                <option value="">Select type...</option>
                {(lookups?.jobTypes || []).map((t: any) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <select value={form.jobStatusId} onChange={e => set('jobStatusId', e.target.value)} className={inputCls(false)}>
                <option value="">Select status...</option>
                {(lookups?.jobStatuses || []).map((s: any) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Assign To">
              <select value={form.assignedEmployeeId} onChange={e => set('assignedEmployeeId', e.target.value)} className={inputCls(false)}>
                <option value="">Select employee...</option>
                {(employees || []).map((e: any) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </FormField>
            <FormField label="Scheduled At">
              <input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} className={inputCls(false)}/>
            </FormField>
          </div>

          <FormField label="Notes">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Additional instructions or notes..." rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors resize-none"/>
          </FormField>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={() => router.push(isEdit ? `/jobs/${id}` : '/jobs')}
            className="flex h-9 items-center rounded-lg border border-gray-200 px-5 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <SaveButton
            isPending={isPending}
            type="submit"
            label={isEdit ? 'Save Changes' : 'Create Job'}
            loadingLabel={isEdit ? 'Saving...' : 'Creating...'}
          />
        </div>
      </form>
    </div>
  );
}
