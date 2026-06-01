// ============================================================
// components/shared/index.tsx
// Shared UI components used across all forms in the app
// ============================================================

'use client';
import { type ConfirmDialogState } from './ConfirmDialog';

// ── SaveButton ────────────────────────────────────────────────
// Standard save/submit button with loading spinner.
// Usage:
//   <SaveButton isPending={mutation.isPending} label="Save Changes" />

interface SaveButtonProps {
  isPending: boolean;
  label?: string;
  loadingLabel?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}

export function SaveButton({
  isPending,
  label = 'Save Changes',
  loadingLabel,
  onClick,
  type = 'button',
  className = '',
}: SaveButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isPending}
      className={`flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    >
      {isPending && (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      )}
      {isPending ? (loadingLabel || 'Saving...') : label}
    </button>
  );
}

// ── ApiErrorBanner ────────────────────────────────────────────
// Shows API error messages from backend responses.
// Usage:
//   <ApiErrorBanner error={apiError} onDismiss={() => setApiError(null)} />

interface ApiErrorBannerProps {
  error: string | null;
  onDismiss?: () => void;
}

export function ApiErrorBanner({ error, onDismiss }: ApiErrorBannerProps) {
  if (!error) return null;
  return (
    <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" className="mt-0.5 flex-shrink-0">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div className="flex-1">
        <div className="text-[13px] font-medium text-red-700">Error</div>
        <div className="mt-0.5 text-[12px] text-red-600">{error}</div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ── SuccessToast ──────────────────────────────────────────────
// Green "Saved" banner shown briefly after successful save.
// Usage:
//   const [saved, setSaved] = useState(false)
//   <SuccessToast visible={saved} message="Employee updated successfully" />

interface SuccessToastProps {
  visible: boolean;
  message?: string;
}

export function SuccessToast({ visible, message = 'Saved successfully' }: SuccessToastProps) {
  if (!visible) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-[13px] font-medium text-green-700">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      {message}
    </div>
  );
}

// ── parseApiError ─────────────────────────────────────────────
// Extracts a readable error message from any API error format.
// Handles both ASP.NET validation errors and our ApiResponse format.
// Usage:
//   onError: (err) => setApiError(parseApiError(err))

export function parseApiError(error: any): string {
  // ASP.NET ModelState validation: { errors: { FieldName: ["msg"] } }
  if (error?.errors && typeof error.errors === 'object') {
    const messages = Object.entries(error.errors)
      .map(([field, msgs]) => {
        const msgList = Array.isArray(msgs) ? msgs : [msgs];
        return `${field}: ${msgList.join(', ')}`;
      })
      .join(' · ');
    return messages || 'Validation failed.';
  }
  // Our ApiResponse: { success: false, message: "..." }
  if (error?.message && typeof error.message === 'string') {
    return error.message;
  }
  // FluentValidation errors in our format: { errors: ["msg1", "msg2"] }
  if (Array.isArray(error?.errors)) {
    return error.errors.join(' · ');
  }
  return 'An unexpected error occurred. Please try again.';
}

// ── FormField ─────────────────────────────────────────────────
// Reusable form field wrapper with label and error message.

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, hint, children }: FormFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

// ── inputCls ──────────────────────────────────────────────────
// Standard input className — pass hasError=true for red border

export const inputCls = (hasError = false) =>
  `w-full rounded-lg border ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'} px-3.5 py-2.5 text-[14px] text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors`;
