import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds an accent gradient ring around the card. */
  accent?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, accent, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-sm',
        'shadow-[var(--shadow-card)]',
        accent && 'ring-1 ring-[var(--color-accent-500)]/20',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

interface SectionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  bodyClassName?: string;
}

export function CardSection({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
  ...rest
}: SectionProps) {
  return (
    <section className={cn('flex flex-col', className)} {...rest}>
      {(title || description || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-[14px] font-semibold tracking-tight text-[var(--color-fg)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      )}
      <div className={cn('px-5 pb-5 pt-4', bodyClassName)}>{children}</div>
    </section>
  );
}
