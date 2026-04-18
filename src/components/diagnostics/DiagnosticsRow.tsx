import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface DiagnosticsRowProps {
  label: ReactNode;
  value: ReactNode;
  /** Mono-format the value (default true) — toggle off for badges, etc. */
  mono?: boolean;
  /** Allow click-to-copy for the value. */
  copyable?: boolean;
  copyText?: string;
}

export function DiagnosticsRow({
  label,
  value,
  mono = true,
  copyable,
  copyText,
}: DiagnosticsRowProps) {
  const handleCopy = async () => {
    if (!copyable) return;
    const text = copyText ?? (typeof value === 'string' ? value : '');
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-3 border-b border-[var(--color-border)] py-1.5 last:border-b-0">
      <div className="text-[10.5px] uppercase tracking-wide text-[var(--color-fg-subtle)]">
        {label}
      </div>
      <div
        className={cn(
          'min-w-0 break-all text-[11.5px] text-[var(--color-fg)]',
          mono && 'font-mono',
          copyable && 'cursor-pointer transition-colors hover:text-[var(--color-accent-300)]',
        )}
        onClick={copyable ? handleCopy : undefined}
        title={copyable ? 'Click to copy' : undefined}
      >
        {value}
      </div>
    </div>
  );
}
