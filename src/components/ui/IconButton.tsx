import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  active?: boolean;
  tone?: 'default' | 'accent' | 'danger';
  size?: 'sm' | 'md';
}

const TONES = {
  default:
    'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-white/[0.05] border-[var(--color-border)]',
  accent:
    'text-[var(--color-accent-300)] bg-[var(--color-accent-500)]/10 border-[var(--color-accent-500)]/30 hover:bg-[var(--color-accent-500)]/15',
  danger:
    'text-[var(--color-danger)] hover:bg-[var(--color-danger-strong)]/10 border-[var(--color-border)]',
};

const SIZES = {
  sm: 'h-9 w-9 rounded-[10px]',
  md: 'h-10 w-10 rounded-[12px]',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, active, tone = 'default', size = 'md', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center justify-center border bg-white/[0.02] transition-[background-color,color,opacity] duration-150',
        'disabled:cursor-not-allowed disabled:opacity-40',
        TONES[tone],
        SIZES[size],
        active && 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-300)] border-[var(--color-accent-500)]/40',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
});
