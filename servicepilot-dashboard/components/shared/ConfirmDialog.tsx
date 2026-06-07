// components/shared/ConfirmDialog.tsx
// Reusable confirmation dialog — matches app design
// Usage:
//   const [dialog, setDialog] = useState<ConfirmDialogState | null>(null)
//   <ConfirmDialog state={dialog} onClose={() => setDialog(null)} />
//   setDialog({ title: 'Deactivate?', message: '...', onConfirm: () => doIt() })

'use client';

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmCls?: string; // tailwind classes for confirm button
  onConfirm: () => void;
}

interface Props {
  state: ConfirmDialogState | null;
  onClose: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({ state, onClose, isLoading }: Props) {
  if (!state) return null;

  return (
    // Backdrop — clicking outside closes dialog
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

        {/* Icon + Title */}
        <div className="mb-4 flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-gray-900">{state.title}</h3>
            <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">{state.message}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex h-9 items-center rounded-lg border border-gray-200 px-4 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => { state.onConfirm(); }}
            disabled={isLoading}
            className={`flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white transition-colors disabled:opacity-70 ${state.confirmCls || 'bg-red-600 hover:bg-red-700'}`}
          >
            {isLoading && (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            {state.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
