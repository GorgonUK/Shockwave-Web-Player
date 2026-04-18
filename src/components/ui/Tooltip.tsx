import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

/** Lightweight CSS-only-ish tooltip — no portal, fine for short hints. */
export function Tooltip({ label, children, side = 'top', className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        role="tooltip"
        aria-hidden={!open}
        className={cn(
          'pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-2 py-1 text-[11px] font-medium text-[var(--color-fg)] shadow-lg transition-opacity duration-150',
          open ? 'opacity-100' : 'opacity-0',
          side === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
        )}
      >
        {label}
      </span>
    </span>
  );
}
