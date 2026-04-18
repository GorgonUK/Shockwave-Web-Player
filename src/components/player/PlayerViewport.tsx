import { forwardRef, type RefObject, type ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import type { PlayerStatus } from '@/types/player';

interface PlayerViewportProps {
  status: PlayerStatus;
  children?: ReactNode;
  /** Outer wrapper used as the fullscreen target. */
  wrapperRef?: RefObject<HTMLDivElement>;
}

const STATUS_LABEL: Record<
  PlayerStatus['kind'],
  { label: string; tone: 'neutral' | 'accent' | 'success' | 'danger' | 'warning' }
> = {
  idle: { label: 'Idle', tone: 'neutral' },
  loading: { label: 'Loading', tone: 'accent' },
  mounted: { label: 'Playing', tone: 'success' },
  'playback-issue': { label: 'Compatibility', tone: 'warning' },
  error: { label: 'Error', tone: 'danger' },
};

/**
 * The styled viewport panel that hosts the runtime. The inner `mountTarget`
 * div is what the DirPlayer adapter writes into — kept absolutely positioned
 * so the runtime can fill it cleanly.
 */
export const PlayerViewport = forwardRef<HTMLDivElement, PlayerViewportProps>(
  function PlayerViewport({ status, children, wrapperRef }, mountRef) {
    const meta = STATUS_LABEL[status.kind];

    return (
      <div
        ref={wrapperRef}
        className={cn(
          'group relative isolate overflow-hidden rounded-[20px] border border-[var(--color-border-strong)]',
          'bg-gradient-to-br from-[#0a0c12] via-[#0b0d14] to-[#070810]',
          'shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.04)]',
        )}
      >
        {/* Top chrome bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-3 pt-3">
          <div className="flex items-center gap-1.5 opacity-70">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/70" />
          </div>
          <Badge
            tone={meta.tone}
            dot={meta.tone === 'success' || meta.tone === 'accent' || meta.tone === 'warning'}
          >
            {meta.label}
          </Badge>
        </div>

        {/* Subtle scanline / noise vibe */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.7) 0 1px, transparent 1px 3px)',
          }}
        />

        {/* Aspect-ratio hosting box */}
        <div className="relative w-full" style={{ aspectRatio: '4 / 3' }}>
          <div
            ref={mountRef}
            data-dirplayer-container=""
            className="absolute inset-0 overflow-hidden bg-black"
            aria-label="Director player viewport"
            role="region"
          />
          {children}
        </div>
      </div>
    );
  },
);
