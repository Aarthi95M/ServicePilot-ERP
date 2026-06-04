'use client';
// app/(dashboard)/employees/new/page.tsx
// Fixed: loading spinners on buttons + API error display + phone field name

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEmployee, useCreateEmployee, useUpdateEmployee } from '@/lib/hooks/useEmployees';
import { useLookups } from '@/lib/hooks/useLookups';

const STEPS = [
  { id: 1, label: 'Personal Info' },
  { id: 2, label: 'Assignment'    },
  { id: 3, label: 'Documents'     },
];

interface EmployeeFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  basicSalary: string;
  branchId: string;
  departmentId: string;
  positionId: string;
  joiningDate: string;
  visaExpiryDate: string;
  passportExpiryDate: string;
  emiratesIdExpiryDate: string;
  isActive: boolean;
}

const EMPTY: EmployeeFormData = {
  fullName: '', email: '', phoneNumber: '', basicSalary: '',
  branchId: '', departmentId: '', positionId: '',
  joiningDate: '', visaExpiryDate: '', passportExpiryDate: '',
  emiratesIdExpiryDate: '', isActive: true,
};

export default function EmployeeFormPage({ isEdit = false }: { isEdit?: boolean }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = isEdit ? params?.id : null;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<EmployeeFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeFormData, string>>>({});

  // API-level error message — shown when backend returns 400 with validation errors
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: existingEmployee } = useEmployee(id);
  const { data: lookups } = useLookups();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const isPending = createEmployee.isPending || updateEmployee.isPending;

  useEffect(() => {
    if (existingEmployee) {
      setForm({
        fullName:             existingEmployee.fullName || '',
        email:                existingEmployee.email || '',
        phoneNumber:          existingEmployee.phoneNumber || '',
        basicSalary:          existingEmployee.basicSalary != null ? String(existingEmployee.basicSalary) : '',
        branchId:             existingEmployee.branchId || '',
        departmentId:         existingEmployee.departmentId || '',
        positionId:           existingEmployee.positionId || '',
        joiningDate:          existingEmployee.joiningDate || '',
        visaExpiryDate:       existingEmployee.visaExpiryDate || '',
        passportExpiryDate:   existingEmployee.passportExpiryDate || '',
        emiratesIdExpiryDate: existingEmployee.emiratesIdExpiryDate || '',
        isActive:             existingEmployee.isActive,
      });
    }
  }, [existingEmployee]);

  const set = (field: keyof EmployeeFormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setApiError(null); // clear API error when user edits
  };

  const validateStep = (): boolean => {
    const errs: typeof errors = {};
    if (step === 1) {
      if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        errs.email = 'Invalid email address.';
    }
    if (step === 2) {
      if (!form.branchId) errs.branchId = 'Please select a branch.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => { if (validateStep()) setStep(s => s + 1); };
  const handleBack = () => { setStep(s => s - 1); setApiError(null); };

  // ── Parse API error response ──────────────────────────────────
  // Backend returns: { errors: { Phone: ["Phone number is required."] } }
  // We extract all messages and show them as a single string.
  const parseApiError = (error: any): string => {
    // ASP.NET validation error format
    if (error?.errors) {
      const messages = Object.values(error.errors)
        .flat()
        .join(' ');
      return messages || 'Validation failed. Please check your input.';
    }
    // Our custom ApiResponse format
    if (error?.message) return error.message;
    // Generic fallback
    return 'An error occurred. Please try again.';
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setApiError(null);

    // Build the DTO — send undefined for empty strings so backend
    // doesn't receive empty string as a value
    const dto = {
      fullName:             form.fullName.trim(),
      email:                form.email || undefined,
      phoneNumber:          form.phoneNumber || undefined,
      basicSalary:          form.basicSalary ? parseFloat(form.basicSalary) : undefined,
      branchId:             form.branchId || undefined,
      departmentId:         form.departmentId || undefined,
      positionId:           form.positionId || undefined,
      joiningDate:          form.joiningDate || undefined,
      visaExpiryDate:       form.visaExpiryDate || undefined,
      passportExpiryDate:   form.passportExpiryDate || undefined,
      emiratesIdExpiryDate: form.emiratesIdExpiryDate || undefined,
      isActive:             form.isActive,
    };

    if (isEdit && id) {
      updateEmployee.mutate(
        { id, dto },
        {
          onSuccess: (res) => {
            if (res.success) router.push(`/employees/${id}`);
            else setApiError(res.message || 'Update failed.');
          },
          onError: (err: any) => setApiError(parseApiError(err)),
        }
      );
    } else {
      createEmployee.mutate(dto, {
        onSuccess: (res) => {
          if (res.success) router.push(`/employees/${res.data?.id}`);
          else setApiError(res.message || 'Create failed.');
        },
        onError: (err: any) => setApiError(parseApiError(err)),
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => router.push(isEdit ? `/employees/${id}` : '/employees')}
        className="mb-5 flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-700 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        {isEdit ? 'Back to Employee' : 'Back to Employees'}
      </button>

      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">
          {isEdit ? 'Edit Employee' : 'Add New Employee'}
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-500">
          {isEdit ? `Editing ${existingEmployee?.fullName}` : 'Fill in the details to create an employee profile.'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-colors ${step === s.id ? 'bg-btn text-white' : step > s.id ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {step > s.id ? '✓' : s.id}
              </div>
              <span className={`text-[13px] font-medium ${step === s.id ? 'text-gray-900' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-3 h-px w-12 ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`}/>
            )}
          </div>
        ))}
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        {/* ── API Error banner ── */}
        {/* Shows errors from the backend — validation failures, duplicates etc. */}
        {apiError && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <div className="text-[13px] font-medium text-red-700">Could not save employee</div>
              <div className="mt-0.5 text-[12px] text-red-600">{apiError}</div>
            </div>
            <button onClick={() => setApiError(null)} className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* STEP 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="mb-4 text-[15px] font-semibold text-gray-800">Personal Information</h2>
            <FormField label="Full Name *" error={errors.fullName}>
              <input value={form.fullName} onChange={e => set('fullName', e.target.value)}
                placeholder="Ahmed Mohammed Al Rashidi" className={inp(!!errors.fullName)}/>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email" error={errors.email}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="ahmed@company.ae" className={inp(!!errors.email)}/>
              </FormField>
              <FormField label="Phone Number">
                <input value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)}
                  placeholder="+971 50 000 0000" className={inp(false)}/>
              </FormField>
            </div>
            <FormField label="Basic Monthly Salary (AED)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.basicSalary}
                onChange={e => set('basicSalary', e.target.value)}
                placeholder="e.g. 5000"
                className={inp(false)}
              />
              <p className="mt-1 text-[11px] text-gray-400">Used to calculate overtime rate (salary ÷ 30 ÷ 8 = AED/hr)</p>
            </FormField>
            <FormField label="Joining Date">
              <input type="date" value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)}
                className={inp(false)}/>
            </FormField>
            {isEdit && (
              <FormField label="Status">
                <select value={form.isActive ? 'active' : 'inactive'}
                  onChange={e => set('isActive', e.target.value === 'active')}
                  className={inp(false)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            )}
          </div>
        )}

        {/* STEP 2: Assignment */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="mb-4 text-[15px] font-semibold text-gray-800">Assignment</h2>
            <FormField label="Branch *" error={errors.branchId}>
              <select value={form.branchId} onChange={e => set('branchId', e.target.value)}
                className={inp(!!errors.branchId)}>
                <option value="">Select branch...</option>
                {lookups?.branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Department">
              <select value={form.departmentId} onChange={e => set('departmentId', e.target.value)}
                className={inp(false)}>
                <option value="">Select department...</option>
                {lookups?.departments?.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Position">
              <select value={form.positionId} onChange={e => set('positionId', e.target.value)}
                className={inp(false)}>
                <option value="">Select position...</option>
                {lookups?.positions?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </FormField>
          </div>
        )}

        {/* STEP 3: Documents */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="mb-4 text-[15px] font-semibold text-gray-800">Document Expiry Dates</h2>
            <p className="text-[13px] text-gray-500 -mt-2">
              Enter expiry dates for UAE compliance tracking. Leave blank if not applicable.
            </p>
            <FormField label="Visa Expiry Date">
              <input type="date" value={form.visaExpiryDate}
                onChange={e => set('visaExpiryDate', e.target.value)} className={inp(false)}/>
            </FormField>
            <FormField label="Passport Expiry Date">
              <input type="date" value={form.passportExpiryDate}
                onChange={e => set('passportExpiryDate', e.target.value)} className={inp(false)}/>
            </FormField>
            <FormField label="Emirates ID Expiry Date">
              <input type="date" value={form.emiratesIdExpiryDate}
                onChange={e => set('emiratesIdExpiryDate', e.target.value)} className={inp(false)}/>
            </FormField>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
          <button onClick={handleBack} disabled={step === 1}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-4 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>

          {step < 3 ? (
            <button onClick={handleNext}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-btn px-5 text-[13px] font-semibold text-white transition-colors hover:bg-btn-hover">
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ) : (
            // ── SUBMIT BUTTON with loading spinner ──
            // disabled + spinner while isPending = true
            // isPending = true from the moment mutate() is called
            // until onSuccess or onError fires
            <button onClick={handleSubmit} disabled={isPending}
              className="flex h-9 items-center gap-2 rounded-lg bg-btn px-5 text-[13px] font-semibold text-white transition-colors hover:bg-btn-hover disabled:opacity-70 disabled:cursor-not-allowed">
              {isPending ? (
                <>
                  {/* Spinner — same pattern as login button */}
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {isEdit ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Create Employee'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inp = (hasError: boolean) =>
  `w-full rounded-lg border ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'} px-3.5 py-2.5 text-[14px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors`;

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
