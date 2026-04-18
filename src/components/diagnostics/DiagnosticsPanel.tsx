import { ChevronDown, Copy, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/utils/cn';
import { DiagnosticsRow } from './DiagnosticsRow';
import { POLYFILL_STATUS_LABELS, type PolyfillStatus } from '@/types/diagnostics';
import type { AssetSlots } from '@/types/assets';
import type { PlayerStatus } from '@/types/player';
import type { BrowserEnv } from '@/lib/browser/env';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { DIRPLAYER_RUNTIME_SOURCE, POLYFILL_SRC } from '@/lib/dirplayer/constants';
import { inferMovieUrlKind } from '@/lib/dirplayer/runtimeDiagnostics';

interface DiagnosticsPanelProps {
  open: boolean;
  onToggle: () => void;
  assets: AssetSlots;
  status: PlayerStatus;
  polyfillStatus: PolyfillStatus;
  runtimeKey: string | null;
  /** URL actually passed to DirPlayer (may be `/__dirplayer-blob/...` proxy). */
  lastEffectiveDcrUrl: string | null;
  env: BrowserEnv;
  viewport: { width: number; height: number };
}

export function DiagnosticsPanel({
  open,
  onToggle,
  assets,
  status,
  polyfillStatus,
  runtimeKey,
  lastEffectiveDcrUrl,
  env,
  viewport,
}: DiagnosticsPanelProps) {
  const {
    errors,
    runtimeScriptEvents,
    runtimeTraceEvents,
    clearErrors,
    clearRuntimeScriptEvents,
    clearRuntimeTraceEvents,
    clearAllDiagnostics,
  } = useDiagnostics();

  const dump = JSON.stringify(
    {
      polyfill: {
        status: polyfillStatus,
        source: DIRPLAYER_RUNTIME_SOURCE,
        src: POLYFILL_SRC,
        runtimeKey,
      },
      player: status,
      lastEffectiveDcrUrl,
      assets: {
        movie: assets.movie ? { name: assets.movie.name, size: assets.movie.size } : null,
        cast: assets.cast ? { name: assets.cast.name, size: assets.cast.size } : null,
      },
      env: {
        platform: env.platform,
        ios: env.isIOS,
        safari: env.isSafari,
        touch: env.isTouch,
        fullscreen: env.supportsFullscreen,
        ua: env.userAgent,
      },
      viewport,
      errors: errors.slice(0, 10),
      runtimeTrace: runtimeTraceEvents.slice(0, 20),
      runtimeCompatibility: runtimeScriptEvents.slice(0, 20),
    },
    null,
    2,
  );

  const copyDump = async () => {
    try {
      await navigator.clipboard?.writeText(dump);
    } catch {
      /* ignore */
    }
  };

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="diagnostics-body"
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-t-[18px] px-5 py-4 text-left transition-colors',
          'hover:bg-white/[0.02]',
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-border)] bg-white/[0.03] text-[var(--color-fg-muted)]">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path
                d="M5 7h14M5 12h14M5 17h9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <h2 className="text-[13.5px] font-semibold text-[var(--color-fg)]">Diagnostics</h2>
            <p className="text-[11px] text-[var(--color-fg-subtle)]">
              Polyfill, mount state, environment & errors
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {errors.length === 0 &&
          runtimeScriptEvents.length === 0 &&
          runtimeTraceEvents.length === 0 ? (
            <Badge tone="success" dot>
              Healthy
            </Badge>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {errors.length > 0 ? (
                <Badge tone="danger">
                  {errors.length} error{errors.length > 1 ? 's' : ''}
                </Badge>
              ) : null}
              {runtimeScriptEvents.length > 0 ? (
                <Badge tone="warning">{runtimeScriptEvents.length} runtime</Badge>
              ) : null}
              {runtimeTraceEvents.length > 0 ? (
                <Badge tone="warning">{runtimeTraceEvents.length} trace</Badge>
              ) : null}
            </div>
          )}
          <ChevronDown
            size={16}
            className={cn(
              'text-[var(--color-fg-muted)] transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </div>
      </button>

      {open ? (
        <div
          id="diagnostics-body"
          className="border-t border-[var(--color-border)] px-5 pb-5 pt-3"
          style={{ animation: 'fadeIn 180ms ease-out both' }}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Polyfill">
              <DiagnosticsRow
                label="Status"
                value={POLYFILL_STATUS_LABELS[polyfillStatus]}
                mono={false}
              />
              <DiagnosticsRow
                label="Runtime source"
                value={DIRPLAYER_RUNTIME_SOURCE}
                mono={false}
              />
              <DiagnosticsRow
                label="Source"
                value={POLYFILL_SRC}
                copyable
                copyText={POLYFILL_SRC}
              />
              <DiagnosticsRow label="Global key" value={runtimeKey ?? 'none'} />
              <DiagnosticsRow label="Mount" value={describePlayer(status)} mono={false} />
            </Section>

            <Section title="Assets">
              <DiagnosticsRow label="Movie name" value={assets.movie?.name ?? '—'} />
              <DiagnosticsRow
                label="Movie URL"
                value={assets.movie?.objectUrl ?? '—'}
                copyable={Boolean(assets.movie?.objectUrl)}
                copyText={assets.movie?.objectUrl}
              />
              <DiagnosticsRow label="Cast name" value={assets.cast?.name ?? '—'} />
              <DiagnosticsRow
                label="Cast URL"
                value={assets.cast?.objectUrl ?? '—'}
                copyable={Boolean(assets.cast?.objectUrl)}
                copyText={assets.cast?.objectUrl}
              />
              <DiagnosticsRow
                label="Effective movie URL (→ DirPlayer)"
                value={lastEffectiveDcrUrl ?? '—'}
                mono
                copyable={Boolean(lastEffectiveDcrUrl)}
                copyText={lastEffectiveDcrUrl ?? undefined}
              />
              <DiagnosticsRow
                label="Movie URL kind"
                value={lastEffectiveDcrUrl ? inferMovieUrlKind(lastEffectiveDcrUrl) : '—'}
                mono={false}
              />
            </Section>

            <Section title="Environment">
              <DiagnosticsRow
                label="Platform"
                value={`${env.platform || '—'}${env.isIOS ? ' · iOS' : ''}${env.isSafari ? ' · Safari' : ''}`}
              />
              <DiagnosticsRow label="Touch" value={String(env.isTouch)} />
              <DiagnosticsRow label="Fullscreen" value={String(env.supportsFullscreen)} />
              <DiagnosticsRow label="Reduced motion" value={String(env.prefersReducedMotion)} />
              <DiagnosticsRow label="Viewport" value={`${viewport.width} × ${viewport.height}`} />
              <DiagnosticsRow
                label="User agent"
                value={env.userAgent}
                copyable
                copyText={env.userAgent}
              />
            </Section>

            <Section
              title="Runtime compatibility"
              action={
                runtimeScriptEvents.length > 0 ? (
                  <IconButton
                    label="Clear runtime log"
                    icon={<Trash2 size={13} />}
                    size="sm"
                    onClick={clearRuntimeScriptEvents}
                  />
                ) : null
              }
            >
              {runtimeScriptEvents.length === 0 ? (
                <p className="text-[12px] text-[var(--color-fg-subtle)]">
                  No DirPlayer script errors captured yet. Missing built-ins and Lingo failures
                  appear here after the alert bridge fires.
                </p>
              ) : (
                <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                  {runtimeScriptEvents.slice(0, 12).map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-md border border-[var(--color-border)] bg-white/[0.015] p-2 font-mono text-[10.5px] leading-snug"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--color-fg-subtle)]">
                        <span className="uppercase tracking-wide text-[var(--color-warning)]">
                          {ev.variant}
                          {ev.parsed.kind === 'missing-builtin'
                            ? ` · ${ev.parsed.handlerName}`
                            : ''}
                        </span>
                        <time>{new Date(ev.at).toLocaleTimeString()}</time>
                      </div>
                      <div className="mt-1 break-all text-[var(--color-fg-muted)]">
                        {ev.rawMessage}
                      </div>
                      {ev.parsed.kind === 'missing-builtin' ? (
                        <div className="mt-1 text-[var(--color-fg-subtle)]">
                          args: (
                          {ev.parsed.argsPreview.length > 120
                            ? `${ev.parsed.argsPreview.slice(0, 120)}…`
                            : ev.parsed.argsPreview}
                          )
                        </div>
                      ) : null}
                      <div className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">
                        movie: {ev.movieFileName ?? '—'} · url: {ev.movieUrlKind}
                        {ev.occurrenceIndex ? ` · repeat #${ev.occurrenceIndex + 1}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="Runtime tracing"
              action={
                runtimeTraceEvents.length > 0 ? (
                  <IconButton
                    label="Clear runtime traces"
                    icon={<Trash2 size={13} />}
                    size="sm"
                    onClick={clearRuntimeTraceEvents}
                  />
                ) : null
              }
            >
              {runtimeTraceEvents.length === 0 ? (
                <p className="text-[12px] text-[var(--color-fg-subtle)]">
                  No local runtime trace events captured yet. When the patched local bundle runs,
                  built-in fallback and getPos patch traces will appear here.
                </p>
              ) : (
                <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                  {runtimeTraceEvents.slice(0, 14).map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-md border border-[var(--color-border)] bg-white/[0.015] p-2 font-mono text-[10.5px] leading-snug"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--color-fg-subtle)]">
                        <span className="uppercase tracking-wide text-[var(--color-warning)]">
                          {ev.parsed.traceKind}
                          {ev.parsed.handlerName ? ` / ${ev.parsed.handlerName}` : ''}
                        </span>
                        <time>{new Date(ev.at).toLocaleTimeString()}</time>
                      </div>
                      {ev.parsed.argTypes.length > 0 ? (
                        <div className="mt-1 text-[var(--color-fg-subtle)]">
                          arg types: {ev.parsed.argTypes.join(', ')}
                        </div>
                      ) : null}
                      {ev.parsed.argsPreview ? (
                        <div className="mt-1 break-all text-[var(--color-fg-muted)]">
                          args: {ev.parsed.argsPreview}
                        </div>
                      ) : null}
                      {ev.parsed.returnType || ev.parsed.returnValue ? (
                        <div className="mt-1 break-all text-[var(--color-fg-subtle)]">
                          return: {ev.parsed.returnType ?? 'unknown'}
                          {ev.parsed.returnValue ? ` = ${ev.parsed.returnValue}` : ''}
                        </div>
                      ) : null}
                      <div className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">
                        movie: {ev.movieFileName ?? '-'} / url: {ev.movieUrlKind}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="Errors"
              action={
                errors.length > 0 ? (
                  <IconButton
                    label="Clear errors"
                    icon={<Trash2 size={13} />}
                    size="sm"
                    onClick={clearErrors}
                  />
                ) : null
              }
            >
              {errors.length === 0 ? (
                <p className="text-[12px] text-[var(--color-fg-subtle)]">No errors recorded.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {errors.slice(0, 10).map((e) => (
                    <li
                      key={e.id}
                      className="rounded-md border border-[var(--color-border)] bg-white/[0.015] p-2 font-mono text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10.5px] text-[var(--color-fg-subtle)]">
                        <span>{e.source}</span>
                        <time>{new Date(e.at).toLocaleTimeString()}</time>
                      </div>
                      <div className="mt-1 break-all text-[var(--color-danger)]">{e.message}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={clearAllDiagnostics}>
              Clear all logs
            </Button>
            <Button variant="ghost" size="sm" icon={<Copy size={13} />} onClick={copyDump}>
              Copy diagnostics JSON
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--color-border)] bg-white/[0.012] p-3">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
          {title}
        </h3>
        {action}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function describePlayer(status: PlayerStatus): string {
  switch (status.kind) {
    case 'idle':
      return 'idle';
    case 'loading':
      return `loading · ${status.step}`;
    case 'mounted':
      return `mounted (${new Date(status.mountedAt).toLocaleTimeString()})`;
    case 'playback-issue':
      return `playback-issue · ${status.variant}`;
    case 'error':
      return `error: ${status.message}`;
  }
}
