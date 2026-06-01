'use client';
// components/shared/ToastProvider.tsx
// Global toast system — shows at top-center of screen
// Usage anywhere in the app:
//   import { useToast } from '@/components/shared/ToastProvider'
//   const { showToast } = useToast()
//   showToast('Saved successfully', 'success')

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

// Global function so it can be called outside React components (e.g. Axios interceptor)
let globalShowToast: ((message: string, type?: Toast['type']) => void) | null = null;
export const showGlobalToast = (message: string, type: Toast['type'] = 'success') => {
  if (globalShowToast) globalShowToast(message, type);
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Register global function
  useEffect(() => {
    globalShowToast = showToast;
    return () => { globalShowToast = null; };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — fixed top-center */}
      <div className="fixed top-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-5 py-3 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 ${
              toast.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' :
              toast.type === 'error'   ? 'border-red-200 bg-red-50 text-red-800'       :
              toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' :
                                         'border-blue-200 bg-blue-50 text-blue-800'
            }`}>
            {/* Icon */}
            {toast.type === 'success' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            {toast.type === 'error' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            )}
            {toast.type === 'warning' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            )}
            {toast.type === 'info' && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            )}
            <span className="text-[13px] font-medium">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Hook to use toast in any component
export function useToast() {
  return useContext(ToastContext);
}
