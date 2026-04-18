import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export function Kbd({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-[5px] border border-[var(--color-border-strong)] bg-white/[0.04] px-1.5 font-mono text-[10.5px] text-[var(--color-fg-muted)]',
        className,
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}
