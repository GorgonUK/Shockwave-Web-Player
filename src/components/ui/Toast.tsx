import { CheckCircle2, Info, TriangleAlert, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Toast as ToastType, ToastTone } from '@/hooks/useToasts';
import { useToasts } from '@/hooks/useToasts';

const ICONS: Record<ToastTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: XCircle,
};

const ACCENT: Record<ToastTone, string> = {
  info: 'text-[var(--color-cyan-400)]',
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  danger: 'text-[var(--color-danger)]',
};

const RING: Record<ToastTone, string> = {
  info: 'ring-[var(--color-cyan-400)]/25',
  success: 'ring-[var(--color-success)]/25',
  warning: 'ring-[var(--color-warning)]/25',
  danger: 'ring-[var(--color-danger)]/25',
};

export function ToastViewport() {
  const { toasts } = useToasts();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:bottom-4 sm:right-4 sm:left-auto sm:items-end sm:px-0"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastCard({ toast }: { toast: ToastType }) {
  const { dismiss } = useToasts();
  const Icon = ICONS[toast.tone];
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full max-w-md gap-3 rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)]/95 p-3.5 shadow-2xl ring-1 backdrop-blur',
        RING[toast.tone],
      )}
      style={{ animation: 'fadeIn 180ms ease-out both' }}
    >
      <div className={cn('mt-0.5 shrink-0', ACCENT[toast.tone])}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-[var(--color-fg)]">{toast.title}</div>
        {toast.description ? (
          <div className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-fg-muted)]">
            {toast.description}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="ml-1 -mr-1 -mt-1 rounded-md p-1 text-[var(--color-fg-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--color-fg)]"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
