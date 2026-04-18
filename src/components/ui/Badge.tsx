import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
  icon?: ReactNode;
}

const TONES: Record<Tone, string> = {
  neutral:
    'bg-white/[0.04] text-[var(--color-fg-muted)] border border-[var(--color-border)]',
  accent:
    'bg-[var(--color-accent-500)]/12 text-[var(--color-accent-300)] border border-[var(--color-accent-500)]/30',
  success:
    'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30',
  warning:
    'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/30',
  danger:
    'bg-[var(--color-danger-strong)]/10 text-[var(--color-danger)] border border-[var(--color-danger-strong)]/30',
  info: 'bg-[var(--color-cyan-400)]/10 text-[var(--color-cyan-400)] border border-[var(--color-cyan-400)]/30',
};

const DOT_COLORS: Record<Tone, string> = {
  neutral: 'bg-[var(--color-fg-muted)]',
  accent: 'bg-[var(--color-accent-400)]',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]',
  info: 'bg-[var(--color-cyan-400)]',
};

export function Badge({
  tone = 'neutral',
  dot,
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[tone])}
          style={
            tone === 'success' || tone === 'accent'
              ? { animation: 'pulseSoft 2s ease-in-out infinite' }
              : undefined
          }
        />
      ) : null}
      {icon}
      {children}
    </span>
  );
}
