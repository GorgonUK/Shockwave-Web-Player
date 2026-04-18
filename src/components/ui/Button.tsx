import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent-500)] text-white shadow-[var(--shadow-glow)] hover:bg-[var(--color-accent-400)] active:bg-[var(--color-accent-600)] disabled:bg-[var(--color-accent-700)]/40 disabled:text-white/60 disabled:shadow-none',
  secondary:
    'bg-white/[0.04] text-[var(--color-fg)] border border-[var(--color-border)] hover:bg-white/[0.07] hover:border-[var(--color-border-strong)] disabled:opacity-50',
  ghost:
    'bg-transparent text-[var(--color-fg)] hover:bg-white/[0.05] disabled:opacity-50',
  danger:
    'bg-[var(--color-danger-strong)]/90 text-white hover:bg-[var(--color-danger-strong)] disabled:opacity-50',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-[10px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[12px]',
  lg: 'h-12 px-5 text-[15px] gap-2.5 rounded-[14px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading,
    icon,
    iconRight,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium transition-[background-color,box-shadow,opacity,transform] duration-150 ease-out',
        'min-h-[44px] sm:min-h-0',
        'disabled:cursor-not-allowed active:scale-[0.98]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children ? <span className="truncate">{children}</span> : null}
      {iconRight}
    </button>
  );
});
