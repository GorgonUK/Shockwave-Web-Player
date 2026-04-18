import type { MovieUrlKind, ParsedDirPlayerScriptMessage } from '@/lib/dirplayer/runtimeDiagnostics';

export type PlayerStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; step: PlayerLoadingStep }
  | { kind: 'mounted'; mountedAt: number }
  | {
      kind: 'playback-issue';
      variant: 'missing-builtin' | 'script' | 'unknown';
      message: string;
      detail: RuntimePlaybackDetail;
    }
  | { kind: 'error'; message: string; phase?: PlayerErrorPhase; cause?: unknown };

export type PlayerErrorPhase = 'container' | 'polyfill' | 'mount' | 'load';

/** Snapshot when DirPlayer reports a script/runtime error after load. */
export interface RuntimePlaybackDetail {
  rawMessage: string;
  parsed: ParsedDirPlayerScriptMessage;
  movieFileName?: string;
  movieUrlKind: MovieUrlKind;
  at: number;
}

export type PlayerLoadingStep =
  | 'preparing'
  | 'loading-polyfill'
  | 'mounting-movie'
  | 'starting-runtime';

export const LOADING_LABELS: Record<PlayerLoadingStep, string> = {
  preparing: 'Preparing assets…',
  'loading-polyfill': 'Loading DirPlayer runtime…',
  'mounting-movie': 'Mounting movie…',
  'starting-runtime': 'Starting playback…',
};
