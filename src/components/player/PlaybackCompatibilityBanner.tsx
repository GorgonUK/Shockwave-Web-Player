import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { PlayerStatus } from '@/types/player';

interface PlaybackCompatibilityBannerProps {
  status: PlayerStatus;
  onReset: () => void;
}

/**
 * Non-blocking banner when the emulator hits a Lingo/runtime error after the
 * movie has started (e.g. missing built-in handler). Keeps the last frame visible.
 */
export function PlaybackCompatibilityBanner({ status, onReset }: PlaybackCompatibilityBannerProps) {
  if (status.kind !== 'playback-issue') return null;

  const { variant, message, detail } = status;
  const isMissing = variant === 'missing-builtin';
  const handler =
    detail.parsed.kind === 'missing-builtin' ? detail.parsed.handlerName : null;
  const argsPrev =
    detail.parsed.kind === 'missing-builtin' ? detail.parsed.argsPreview : null;

  return (
    <div
      role="alert"
      className="rounded-[14px] border border-[var(--color-warning)]/35 bg-[var(--color-warning)]/[0.08] p-3 sm:p-4"
      style={{ animation: 'fadeIn 220ms ease-out both' }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
            <AlertOctagon size={18} aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-[var(--color-fg)]">
              {isMissing ? 'Emulator compatibility: missing built-in' : 'Director script error'}
            </h3>
            <p className="mt-1 break-words font-mono text-[11.5px] leading-relaxed text-[var(--color-fg-muted)]">
              {message}
            </p>
            {handler ? (
              <p className="mt-2 text-[11px] text-[var(--color-fg-subtle)]">
                Handler: <span className="font-mono text-[var(--color-accent-300)]">{handler}</span>
                {argsPrev ? (
                  <>
                    {' '}
                    · args:{' '}
                    <span className="font-mono text-[var(--color-fg-muted)]">
                      ({argsPrev.length > 180 ? `${argsPrev.slice(0, 180)}…` : argsPrev})
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-fg-subtle)]">
              {isMissing
                ? 'This call is implemented inside DirPlayer (Rust/WASM), not in this web shell. A fix requires an emulator update or an official extension API — we do not fake handler results here.'
                : 'See Diagnostics → Runtime compatibility for history and context.'}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 self-start"
          icon={<RotateCcw size={14} />}
          onClick={onReset}
        >
          Reset player
        </Button>
      </div>
    </div>
  );
}
