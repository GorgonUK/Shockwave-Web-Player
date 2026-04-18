import { AlertTriangle, Film, Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { LOADING_LABELS, type PlayerStatus } from '@/types/player';

interface PlayerStateOverlayProps {
  status: PlayerStatus;
  hasMovie: boolean;
}

export function PlayerStateOverlay({ status, hasMovie }: PlayerStateOverlayProps) {
  if (status.kind === 'mounted' || status.kind === 'playback-issue') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6"
      style={{ animation: 'fadeIn 200ms ease-out both' }}
    >
      <div className="pointer-events-auto flex max-w-md flex-col items-center gap-3 text-center">
        {status.kind === 'idle' && <IdleState hasMovie={hasMovie} />}
        {status.kind === 'loading' && <LoadingState label={LOADING_LABELS[status.step]} />}
        {status.kind === 'error' && <ErrorState message={status.message} />}
      </div>
    </div>
  );
}

function IdleState({ hasMovie }: { hasMovie: boolean }) {
  return (
    <>
      <div className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-[var(--color-fg-muted)]">
        {hasMovie ? <Sparkles size={22} /> : <Film size={22} />}
      </div>
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--color-fg)]">
          {hasMovie ? 'Ready to play' : 'Player viewport'}
        </h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">
          {hasMovie
            ? 'Press Load to mount the Director movie inside this viewport.'
            : 'Upload a .dcr file to begin. Movies render here at their native stage size.'}
        </p>
      </div>
    </>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <>
      <div className="text-[var(--color-accent-300)]">
        <Spinner size="lg" />
      </div>
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--color-fg)]">Loading…</h3>
        <p className="mt-0.5 text-[12.5px] text-[var(--color-fg-muted)]">{label}</p>
      </div>
    </>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <>
      <div className="grid h-14 w-14 place-items-center rounded-full border border-[var(--color-danger)]/30 bg-[var(--color-danger-strong)]/10 text-[var(--color-danger)]">
        <AlertTriangle size={22} />
      </div>
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--color-fg)]">
          Could not start playback
        </h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">{message}</p>
      </div>
    </>
  );
}
