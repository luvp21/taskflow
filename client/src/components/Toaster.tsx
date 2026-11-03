import clsx from 'clsx';
import { useEffect } from 'react';
import { useUiStore, type Toast } from '../store/uiStore.ts';

const TOAST_DURATION_MS = 4000;

function ToastItem({ toast }: { toast: Toast }) {
  const dismissToast = useUiStore((state) => state.dismissToast);

  // Each toast owns its timer; unmounting (manual dismiss) clears it.
  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismissToast]);

  return (
    <li
      className={clsx(
        'flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg',
        toast.tone === 'error' && 'border-l-4 border-l-danger',
      )}
    >
      <p className="flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        className="-mr-1 rounded px-1 text-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        ✕
      </button>
    </li>
  );
}

// The live region is always in the DOM (even when empty), so screen readers are
// already listening when the first message is added. "polite" waits until the
// user is idle instead of interrupting.
export function Toaster() {
  const toasts = useUiStore((state) => state.toasts);

  return (
    <ul
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 [&>li]:pointer-events-auto"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ul>
  );
}
