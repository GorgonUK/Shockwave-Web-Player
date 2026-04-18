import type {
  MovieUrlKind,
  ParsedDirPlayerRuntimeTrace,
  ParsedDirPlayerScriptMessage,
} from '@/lib/dirplayer/runtimeDiagnostics';

export interface DiagnosticsErrorEntry {
  id: string;
  at: number;
  source: string;
  message: string;
  detail?: string;
}

/** Rolling log of DirPlayer VM script errors (from alert bridge). */
export interface RuntimeScriptEventEntry {
  id: string;
  at: number;
  rawMessage: string;
  parsed: ParsedDirPlayerScriptMessage;
  variant: 'missing-builtin' | 'script' | 'unknown';
  movieFileName?: string;
  movieUrlKind: MovieUrlKind;
  source: 'alert-bridge';
  /** Count of prior occurrences of same normalized key (missing handler name + raw prefix) */
  occurrenceIndex?: number;
}

/** Rolling log of runtime debug traces emitted by the patched local bundle. */
export interface RuntimeTraceEventEntry {
  id: string;
  at: number;
  rawMessage: string;
  parsed: ParsedDirPlayerRuntimeTrace;
  movieFileName?: string;
  movieUrlKind: MovieUrlKind;
  source: 'debug-bridge';
}

export type PolyfillStatus =
  | 'unknown'
  | 'not-loaded'
  | 'loading'
  | 'ready'
  | 'script-missing'
  | 'loaded-no-global'
  | 'error';

export const POLYFILL_STATUS_LABELS: Record<PolyfillStatus, string> = {
  unknown: 'Unknown',
  'not-loaded': 'Not loaded',
  loading: 'Loading...',
  ready: 'Ready',
  'script-missing': 'Script not found (404)',
  'loaded-no-global': 'Loaded / awaiting global',
  error: 'Failed to load',
};
