import { cn } from '@/lib/utils/cn';

export function Spinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dim = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block', className)}
      style={{ width: dim, height: dim }}
    >
      <svg viewBox="0 0 24 24" width={dim} height={dim} aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeOpacity="0.18"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="0.85s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </span>
  );
}
