import { Hand, MonitorSmartphone } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { POLYFILL_STATUS_LABELS, type PolyfillStatus } from '@/types/diagnostics';
import type { AssetSlots } from '@/types/assets';
import type { BrowserEnv } from '@/lib/browser/env';
import { describeBrowser } from '@/lib/browser/env';
import type { PlayerStatus } from '@/types/player';
import { LOADING_LABELS } from '@/types/player';

interface StatusBarProps {
  polyfillStatus: PolyfillStatus;
  runtimeKey: string | null;
  assets: AssetSlots;
  env: BrowserEnv;
  playerStatus: PlayerStatus;
}

const TONE: Record<PolyfillStatus, 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  unknown: 'neutral',
  'not-loaded': 'neutral',
  loading: 'accent',
  ready: 'success',
  'script-missing': 'warning',
  'loaded-no-global': 'warning',
  error: 'danger',
};

function runtimeBadgeMeta(
  status: PlayerStatus,
): { label: string; tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' } {
  switch (status.kind) {
    case 'idle':
      return { label: 'Runtime · idle', tone: 'neutral' };
    case 'loading':
      return { label: `Runtime · ${LOADING_LABELS[status.step]}`, tone: 'accent' };
    case 'mounted':
      return { label: 'Runtime · mounted', tone: 'success' };
    case 'playback-issue': {
      if (status.variant === 'missing-builtin' && status.detail.parsed.kind === 'missing-builtin') {
        return {
          label: `Runtime · missing “${status.detail.parsed.handlerName}”`,
          tone: 'warning',
        };
      }
      return { label: 'Runtime · script compatibility', tone: 'warning' };
    }
    case 'error': {
      const phase = status.phase ? ` (${status.phase})` : '';
      return { label: `Runtime · error${phase}`, tone: 'danger' };
    }
  }
}

export function StatusBar({ polyfillStatus, runtimeKey, assets, env, playerStatus }: StatusBarProps) {
  const rt = runtimeBadgeMeta(playerStatus);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-3 py-2 text-[11.5px]">
      <Badge tone={TONE[polyfillStatus]} dot={polyfillStatus === 'loading' || polyfillStatus === 'ready'}>
        Polyfill · {POLYFILL_STATUS_LABELS[polyfillStatus]}
        {runtimeKey ? ` · window.${runtimeKey}` : ''}
      </Badge>

      <Badge
        tone={rt.tone}
        dot={rt.tone === 'accent' || rt.tone === 'success' || rt.tone === 'warning'}
      >
        {rt.label}
      </Badge>

      <Separator />

      <span className="truncate font-mono text-[var(--color-fg-muted)]">
        Movie:{' '}
        <span className={assets.movie ? 'text-[var(--color-fg)]' : 'text-[var(--color-fg-subtle)]'}>
          {assets.movie?.name ?? '—'}
        </span>
      </span>

      <span className="truncate font-mono text-[var(--color-fg-muted)]">
        Cast:{' '}
        <span className={assets.cast ? 'text-[var(--color-fg)]' : 'text-[var(--color-fg-subtle)]'}>
          {assets.cast?.name ?? '—'}
        </span>
      </span>

      <Separator />

      <span className="inline-flex items-center gap-1.5 text-[var(--color-fg-muted)]">
        <MonitorSmartphone size={12} />
        {describeBrowser(env)}
      </span>
      {env.isTouch ? (
        <span className="inline-flex items-center gap-1 text-[var(--color-fg-muted)]">
          <Hand size={12} />
          Touch
        </span>
      ) : null}
    </div>
  );
}

function Separator() {
  return <span className="hidden h-3 w-px bg-[var(--color-border-strong)] sm:inline-block" />;
}
