import { useCallback, useMemo, useRef, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Footer } from '@/components/layout/Footer';
import { ShellLayout } from '@/components/layout/ShellLayout';
import { UploadPanel } from '@/components/upload/UploadPanel';
import { FileSummary } from '@/components/upload/FileSummary';
import { CompatibilityNotes } from '@/components/diagnostics/CompatibilityNotes';
import { DiagnosticsPanel } from '@/components/diagnostics/DiagnosticsPanel';
import { PlayerViewport } from '@/components/player/PlayerViewport';
import { PlayerStateOverlay } from '@/components/player/PlayerStateOverlay';
import { PlaybackCompatibilityBanner } from '@/components/player/PlaybackCompatibilityBanner';
import { PlayerControls } from '@/components/player/PlayerControls';
import { StatusBar } from '@/components/player/StatusBar';
import { ToastViewport } from '@/components/ui/Toast';
import { useObjectUrls } from '@/hooks/useObjectUrls';
import { useDirPlayer } from '@/hooks/useDirPlayer';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useToasts } from '@/hooks/useToasts';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useViewportSize } from '@/hooks/useMediaQuery';
import { detectEnv } from '@/lib/browser/env';
import { assignDrops } from '@/lib/files/assignDrops';
import { validateFile } from '@/lib/files/validation';
import { createId } from '@/lib/utils/ids';
import type { AssetKind, AssetSlots, UploadedAsset } from '@/types/assets';

export function App() {
  const env = useMemo(detectEnv, []);
  const viewport = useViewportSize();
  const { push } = useToasts();
  const { create, release } = useObjectUrls();

  const [assets, setAssets] = useState<AssetSlots>({ movie: null, cast: null });
  const [debugOpen, setDebugOpen] = useLocalStorage<boolean>('swp.debug.open', false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { isFullscreen, supported: fullscreenSupported, toggle: toggleFullscreen } = useFullscreen(
    wrapperRef,
  );

  const { status, polyfillStatus, runtimeKey, lastEffectiveDcrUrl, load, reset } = useDirPlayer({
    containerRef,
    assets,
    onMounted: () => push({ tone: 'success', title: 'Movie mounted', description: assets.movie?.name }),
    onError: (message) => push({ tone: 'danger', title: 'Load failed', description: message }),
  });

  /* -----------------------------  asset wiring  ---------------------------- */

  const replaceSlot = useCallback(
    (kind: AssetKind, file: File | null) => {
      setAssets((prev) => {
        const slot = kind === 'dcr' ? prev.movie : prev.cast;
        // Revoke previous URL when replacing or clearing.
        if (slot) release(slot.objectUrl);

        let next: UploadedAsset | null = null;
        if (file) {
          const objectUrl = create(file);
          next = {
            id: createId('asset'),
            kind,
            file,
            name: file.name,
            size: file.size,
            objectUrl,
            pickedAt: Date.now(),
          };
        }
        return kind === 'dcr' ? { ...prev, movie: next } : { ...prev, cast: next };
      });
    },
    [create, release],
  );

  const onPickSlot = useCallback(
    (kind: AssetKind, file: File) => {
      const v = validateFile(file);
      if (!v.ok) {
        push({ tone: 'warning', title: 'File rejected', description: v.reason });
        return;
      }
      if (v.kind !== kind) {
        push({
          tone: 'warning',
          title: 'Wrong slot',
          description: `That file looks like .${v.kind} — placed it in the ${v.kind.toUpperCase()} slot instead.`,
        });
        replaceSlot(v.kind, file);
        return;
      }
      replaceSlot(kind, file);
    },
    [push, replaceSlot],
  );

  const onDropFiles = useCallback(
    (files: File[]) => {
      const result = assignDrops(files);
      result.rejected.forEach((r) =>
        push({ tone: 'warning', title: 'File rejected', description: r.reason }),
      );
      result.warnings.forEach((w) => push({ tone: 'info', title: 'Heads up', description: w }));
      if (result.movie) replaceSlot('dcr', result.movie);
      if (result.cast) replaceSlot('cct', result.cast);
      if (!result.movie && !result.cast && result.rejected.length === 0) {
        push({ tone: 'info', title: 'Nothing to do', description: 'No matching files found.' });
      }
    },
    [push, replaceSlot],
  );

  const onRemoveSlot = useCallback(
    (kind: AssetKind) => {
      const wasMounted = status.kind === 'mounted' || status.kind === 'playback-issue';
      replaceSlot(kind, null);
      if (kind === 'dcr' && wasMounted) {
        void reset();
      }
    },
    [replaceSlot, reset, status.kind],
  );

  const onClearAll = useCallback(async () => {
    await reset();
    setAssets((prev) => {
      if (prev.movie) release(prev.movie.objectUrl);
      if (prev.cast) release(prev.cast.objectUrl);
      return { movie: null, cast: null };
    });
    push({ tone: 'info', title: 'Cleared', description: 'All files removed.' });
  }, [push, release, reset]);

  const onToggleFullscreen = useCallback(async () => {
    if (!fullscreenSupported) {
      push({
        tone: 'info',
        title: 'Fullscreen unavailable',
        description: 'This browser does not allow programmatic fullscreen on this element.',
      });
      return;
    }
    try {
      await toggleFullscreen();
    } catch (err) {
      push({
        tone: 'warning',
        title: 'Fullscreen failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [fullscreenSupported, push, toggleFullscreen]);

  const canLoad = Boolean(assets.movie) && status.kind !== 'loading';

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />

      <ShellLayout
        sidebar={
          <>
            <UploadPanel
              assets={assets}
              onDropFiles={onDropFiles}
              onPickSlot={onPickSlot}
              onRemoveSlot={onRemoveSlot}
              onClearAll={onClearAll}
            />
            <FileSummary assets={assets} />
            <CompatibilityNotes env={env} />
          </>
        }
        main={
          <>
            <PlayerViewport status={status} ref={containerRef} wrapperRef={wrapperRef}>
              <PlayerStateOverlay status={status} hasMovie={Boolean(assets.movie)} />
            </PlayerViewport>
            <PlaybackCompatibilityBanner status={status} onReset={() => void reset()} />
            <PlayerControls
              status={status}
              canLoad={canLoad}
              onLoad={load}
              onReset={reset}
              onToggleFullscreen={onToggleFullscreen}
              fullscreenSupported={fullscreenSupported}
              isFullscreen={isFullscreen}
              debugOpen={debugOpen}
              onToggleDebug={() => setDebugOpen((v) => !v)}
            />
            <StatusBar
              polyfillStatus={polyfillStatus}
              runtimeKey={runtimeKey}
              assets={assets}
              env={env}
              playerStatus={status}
            />
            <DiagnosticsPanel
              open={debugOpen}
              onToggle={() => setDebugOpen((v) => !v)}
              assets={assets}
              status={status}
              polyfillStatus={polyfillStatus}
              runtimeKey={runtimeKey}
              lastEffectiveDcrUrl={lastEffectiveDcrUrl}
              env={env}
              viewport={viewport}
            />
          </>
        }
      />

      <div className="mt-auto">
        <Footer />
      </div>

      <ToastViewport />
    </div>
  );
}
