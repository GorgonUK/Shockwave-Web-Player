/**
 * useDirPlayer — orchestrates the polyfill load + mount/unmount lifecycle.
 *
 * Notes on .cct path resolution
 * -----------------------------
 * Director runtimes typically resolve external casts (e.g. "sound.cct") by
 * relative *filename* next to the .dcr movie. When users upload files locally
 * those bytes become opaque `blob:` object URLs with no filename and no
 * parent directory, so the runtime cannot satisfy `castLib("sound")` lookups
 * via the URL alone. Strategies for later:
 *   - virtual filesystem hook: register the .cct under its original name
 *     before the movie initializes (requires polyfill cooperation)
 *   - custom fetch interceptor: rewrite requests for `sound.cct` to the blob URL
 *   - serve assets from a real path (e.g. /games/<slug>/sound.cct) at build-
 *     or run-time and use that as the basePath
 * When both files use `blob:` URLs, [`ensureWasmSafeBlobSession`] registers the
 * .dcr and optional .cct under the same `/__dirplayer-blob/<uuid>/` prefix so
 * relative fetches like `sound.cct` resolve (same origin as the movie).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { mountDirPlayer } from '@/lib/dirplayer/dirPlayerMount';
import { ensurePolyfillLoaded, getCachedLoaderResult } from '@/lib/dirplayer/dirPlayerLoader';
import { ensureWasmSafeBlobSession, revokeWasmSafeBlobUrls } from '@/lib/dirplayer/wasmSafeMovieUrl';
import { validateDirectorMovieMagic } from '@/lib/dirplayer/validateDirectorMovieMagic';
import {
  classifyPlaybackIssue,
  inferMovieUrlKind,
  parseDirPlayerRuntimeTraceMessage,
  parseDirPlayerScriptMessage,
} from '@/lib/dirplayer/runtimeDiagnostics';
import {
  DIRPLAYER_DEBUG_MESSAGE_EVENT,
  DIRPLAYER_SCRIPT_ERROR_EVENT,
  type DirPlayerDebugMessageDetail,
  type DirPlayerScriptErrorDetail,
} from '@/lib/dirplayer/runtimeErrorBridge';
import { findHandlersForMissingBuiltin } from '@/lib/dirplayer/compat/registry';
import type { MountConfig, MountedInstance } from '@/lib/dirplayer/types';
import type { PlayerStatus } from '@/types/player';
import type { PolyfillStatus } from '@/types/diagnostics';
import type { AssetSlots } from '@/types/assets';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { describeError, toErrorMessage } from '@/lib/utils/errors';
import {
  attachDirectorInputTrace,
  focusDirectorStage,
} from '@/lib/dirplayer/directorInput';

interface UseDirPlayerOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  assets: AssetSlots;
  /** Called when status transitions to 'mounted' (for toasts). */
  onMounted?: () => void;
  /** Called when load() resolves into an error state. */
  onError?: (message: string) => void;
}

interface UseDirPlayerReturn {
  status: PlayerStatus;
  polyfillStatus: PolyfillStatus;
  runtimeKey: string | null;
  /** Last URL passed into DirPlayer for the .dcr (may be SW proxy URL). */
  lastEffectiveDcrUrl: string | null;
  load: () => Promise<void>;
  reset: () => Promise<void>;
  /** Re-probe the polyfill (e.g. after the user adds the file). */
  refreshPolyfill: () => Promise<void>;
}

export function useDirPlayer(opts: UseDirPlayerOptions): UseDirPlayerReturn {
  const { containerRef, assets, onMounted, onError } = opts;
  const diagnostics = useDiagnostics();

  const [status, setStatus] = useState<PlayerStatus>({ kind: 'idle' });
  const [polyfillStatus, setPolyfillStatus] = useState<PolyfillStatus>('not-loaded');
  const [runtimeKey, setRuntimeKey] = useState<string | null>(null);
  const [lastEffectiveDcrUrl, setLastEffectiveDcrUrl] = useState<string | null>(null);
  const mountedRef = useRef<MountedInstance | null>(null);
  /** Synthetic blob-session URLs (movie + optional cast) — revoke all on teardown. */
  const syntheticBlobUrlsRef = useRef<string[] | null>(null);
  const inputTraceDetachRef = useRef<(() => void) | null>(null);
  /** Context for DirPlayer script errors (set when dcr URL is resolved in load()). */
  const playbackContextRef = useRef<{
    movieFileName?: string;
    movieUrlKind: ReturnType<typeof inferMovieUrlKind>;
    effectiveDcrUrl: string;
  } | null>(null);

  // Initial probe — non-blocking, best-effort.
  useEffect(() => {
    let cancelled = false;
    setPolyfillStatus('loading');
    ensurePolyfillLoaded()
      .then((res) => {
        if (cancelled) return;
        setPolyfillStatus(loaderToStatus(res.status));
        if (res.status === 'ready') setRuntimeKey(res.runtimeKey ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setPolyfillStatus('error');
        diagnostics.recordError({
          source: 'polyfill',
          message: toErrorMessage(err, 'Polyfill load failed'),
          detail: describeError(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [diagnostics]);

  const teardown = useCallback(async () => {
    if (syntheticBlobUrlsRef.current?.length) {
      await revokeWasmSafeBlobUrls(syntheticBlobUrlsRef.current);
      syntheticBlobUrlsRef.current = null;
    }
    try {
      inputTraceDetachRef.current?.();
    } catch {
      /* ignore */
    }
    inputTraceDetachRef.current = null;

    const inst = mountedRef.current;
    mountedRef.current = null;
    if (inst) {
      try {
        await inst.destroy();
      } catch (err) {
        diagnostics.recordError({
          source: 'mount',
          message: toErrorMessage(err, 'Destroy failed'),
          detail: describeError(err),
        });
      }
    }
    // Belt-and-suspenders: clear container in case destroy missed something.
    const container = containerRef.current;
    if (container) {
      while (container.firstChild) container.removeChild(container.firstChild);
    }
  }, [containerRef, diagnostics]);

  const load = useCallback(async () => {
    const container = containerRef.current;
    if (!container) {
      setStatus({
        kind: 'error',
        message: 'Player container is not mounted yet.',
        phase: 'container',
      });
      onError?.('Player container is not mounted yet.');
      return;
    }
    if (!assets.movie) {
      const message = 'Select a .dcr movie file before loading.';
      setStatus({ kind: 'error', message, phase: 'load' });
      onError?.(message);
      return;
    }

    await teardown();

    setStatus({ kind: 'loading', step: 'preparing' });

    try {
      setStatus({ kind: 'loading', step: 'loading-polyfill' });
      const loader = await ensurePolyfillLoaded();
      setPolyfillStatus(loaderToStatus(loader.status));
      if (loader.status === 'ready') setRuntimeKey(loader.runtimeKey ?? null);

      setStatus({ kind: 'loading', step: 'mounting-movie' });

      const magic = await validateDirectorMovieMagic(assets.movie.file);
      if (!magic.ok) {
        setStatus({ kind: 'error', message: magic.message, phase: 'load' });
        onError?.(magic.message);
        return;
      }

      const session = await ensureWasmSafeBlobSession({
        movie: { file: assets.movie.file, objectUrl: assets.movie.objectUrl },
        cast: assets.cast
          ? {
              file: assets.cast.file,
              objectUrl: assets.cast.objectUrl,
              name: assets.cast.name,
            }
          : null,
      });
      const dcrUrl = session.movieHttpUrl;
      syntheticBlobUrlsRef.current =
        session.cachedHttpUrls.length > 0 ? session.cachedHttpUrls : null;
      const urlKind = inferMovieUrlKind(dcrUrl);
      playbackContextRef.current = {
        movieFileName: assets.movie.name,
        movieUrlKind: urlKind,
        effectiveDcrUrl: dcrUrl,
      };
      setLastEffectiveDcrUrl(dcrUrl);

      const config: MountConfig = {
        container,
        dcrUrl,
        dcrName: assets.movie.name,
        cct: assets.cast
          ? {
              url: assets.cast.objectUrl,
              name: assets.cast.name,
              size: assets.cast.size,
            }
          : undefined,
        onError: (err) =>
          diagnostics.recordError({
            source: 'runtime',
            message: toErrorMessage(err, 'Runtime error'),
            detail: describeError(err),
          }),
      };

      const instance = await mountDirPlayer(config);
      mountedRef.current = instance;
      setRuntimeKey(instance.runtimeKey);

      inputTraceDetachRef.current?.();
      inputTraceDetachRef.current = attachDirectorInputTrace(instance.host);
      focusDirectorStage(instance.host);
      requestAnimationFrame(() => focusDirectorStage(instance.host));
      for (const ms of [50, 200, 600]) {
        window.setTimeout(() => focusDirectorStage(instance.host), ms);
      }

      setStatus({ kind: 'loading', step: 'starting-runtime' });
      // Microtask to let the runtime have a tick before we declare success.
      await new Promise((r) => setTimeout(r, 0));

      // If the polyfill wasn't actually ready, surface that as the dominant message
      // — the mount adapter rendered a polished fallback inside the host already.
      if (loader.status !== 'ready') {
        const message = loaderToUserMessage(loader.status);
        setStatus({ kind: 'error', message, phase: 'polyfill' });
        onError?.(message);
        return;
      }

      setStatus({ kind: 'mounted', mountedAt: Date.now() });
      onMounted?.();
    } catch (err) {
      const message = toErrorMessage(err, 'Failed to load movie');
      setStatus({ kind: 'error', message, phase: 'mount', cause: err });
      diagnostics.recordError({
        source: 'mount',
        message,
        detail: describeError(err),
      });
      onError?.(message);
    }
  }, [assets, containerRef, diagnostics, onError, onMounted, teardown]);

  /** Clicks on the viewport should focus the Director stage (keyboard only works when #stage_canvas_container is focused). */
  useEffect(() => {
    if (status.kind !== 'mounted') return;
    const root = containerRef.current;
    if (!root) return;
    const onPointerDownCapture = () => {
      const host = root.querySelector<HTMLElement>('[data-dirplayer-host]');
      focusDirectorStage(host);
    };
    root.addEventListener('pointerdown', onPointerDownCapture, true);
    return () => root.removeEventListener('pointerdown', onPointerDownCapture, true);
  }, [status.kind, containerRef]);

  const reset = useCallback(async () => {
    await teardown();
    playbackContextRef.current = null;
    setLastEffectiveDcrUrl(null);
    setStatus({ kind: 'idle' });
  }, [teardown]);

  // DirPlayer surfaces Lingo/VM errors via `alert('Script error: …')` (see runtimeErrorBridge).
  useEffect(() => {
    const onScript = (ev: Event) => {
      const ce = ev as CustomEvent<DirPlayerScriptErrorDetail>;
      const raw = ce.detail?.raw ?? '';
      if (!raw) return;

      const parsed = parseDirPlayerScriptMessage(raw);
      const variant = classifyPlaybackIssue(parsed);
      const ctx = playbackContextRef.current;
      const movieUrlKind = ctx?.movieUrlKind ?? 'unknown';
      const movieFileName = ctx?.movieFileName ?? assets.movie?.name;

      const compatMatches =
        parsed.kind === 'missing-builtin' && movieFileName
          ? findHandlersForMissingBuiltin(movieFileName, parsed.handlerName)
          : [];

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[Shockwave Web Player][DirPlayer script]', {
          raw,
          parsed,
          variant,
          movieFileName,
          movieUrlKind,
          compatRegistryMatches: compatMatches.map((r) => r.id),
        });
      }

      diagnostics.recordRuntimeScriptEvent({
        rawMessage: raw,
        parsed,
        variant,
        movieFileName,
        movieUrlKind,
        source: 'alert-bridge',
      });

      diagnostics.recordError({
        source: 'dirplayer-script',
        message: raw,
        detail:
          parsed.kind === 'missing-builtin'
            ? `Missing built-in: ${parsed.handlerName} — args: ${parsed.argsPreview.slice(0, 200)}`
            : undefined,
      });

      const detail = {
        rawMessage: raw,
        parsed,
        movieFileName,
        movieUrlKind,
        at: Date.now(),
      };
      setStatus({
        kind: 'playback-issue',
        variant,
        message: raw,
        detail,
      });

      const short =
        parsed.kind === 'missing-builtin'
          ? `DirPlayer: missing built-in “${parsed.handlerName}” (emulator gap)`
          : 'Director script error';
      onError?.(short);
    };

    window.addEventListener(DIRPLAYER_SCRIPT_ERROR_EVENT, onScript);
    return () => window.removeEventListener(DIRPLAYER_SCRIPT_ERROR_EVENT, onScript);
  }, [assets.movie?.name, diagnostics, onError]);

  useEffect(() => {
    const onDebugMessage = (ev: Event) => {
      const ce = ev as CustomEvent<DirPlayerDebugMessageDetail>;
      const raw = ce.detail?.message ?? '';
      const parsed = parseDirPlayerRuntimeTraceMessage(raw);
      if (!parsed) return;

      const ctx = playbackContextRef.current;
      const movieUrlKind = ctx?.movieUrlKind ?? 'unknown';
      const movieFileName = ctx?.movieFileName ?? assets.movie?.name;

      // eslint-disable-next-line no-console
      console.info('[Shockwave Web Player][DirPlayer runtime]', {
        raw,
        parsed,
        movieFileName,
        movieUrlKind,
      });

      diagnostics.recordRuntimeTraceEvent({
        rawMessage: raw,
        parsed,
        movieFileName,
        movieUrlKind,
        source: 'debug-bridge',
      });
    };

    window.addEventListener(DIRPLAYER_DEBUG_MESSAGE_EVENT, onDebugMessage);
    return () => window.removeEventListener(DIRPLAYER_DEBUG_MESSAGE_EVENT, onDebugMessage);
  }, [assets.movie?.name, diagnostics]);

  const refreshPolyfill = useCallback(async () => {
    setPolyfillStatus('loading');
    try {
      const res = await ensurePolyfillLoaded();
      setPolyfillStatus(loaderToStatus(res.status));
      if (res.status === 'ready') setRuntimeKey(res.runtimeKey ?? null);
    } catch (err) {
      setPolyfillStatus('error');
      diagnostics.recordError({
        source: 'polyfill',
        message: toErrorMessage(err, 'Polyfill probe failed'),
      });
    }
  }, [diagnostics]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  // Keep polyfillStatus in sync if loader cache changes externally.
  useEffect(() => {
    const cached = getCachedLoaderResult();
    if (cached) setPolyfillStatus(loaderToStatus(cached.status));
  }, []);

  return {
    status,
    polyfillStatus,
    runtimeKey,
    lastEffectiveDcrUrl,
    load,
    reset,
    refreshPolyfill,
  };
}

function loaderToStatus(
  s: 'ready' | 'script-missing' | 'loaded-no-global' | 'error',
): PolyfillStatus {
  switch (s) {
    case 'ready':
      return 'ready';
    case 'script-missing':
      return 'script-missing';
    case 'loaded-no-global':
      return 'loaded-no-global';
    case 'error':
      return 'error';
  }
}

function loaderToUserMessage(s: 'script-missing' | 'loaded-no-global' | 'error'): string {
  switch (s) {
    case 'script-missing':
      return 'DirPlayer polyfill not installed yet. Drop the bundle into /public/dirplayer/.';
    case 'loaded-no-global':
      return 'DirPlayer script loaded but no runtime global was found.';
    case 'error':
      return 'Failed to load the DirPlayer polyfill bundle.';
  }
}
