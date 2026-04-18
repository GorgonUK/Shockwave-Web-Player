/**
 * Public shape of the DirPlayer integration. The rest of the app only depends
 * on these types — never on the actual polyfill internals.
 */

export interface CastAsset {
  url: string;
  /**
   * Original filename (e.g. "sound.cct"). Some Director runtimes resolve
   * external casts by *filename* relative to the movie. Keep this around so
   * the future bridge can register the asset under its expected name.
   */
  name: string;
  size?: number;
}

export interface MountConfig {
  container: HTMLElement;
  /**
   * URL the runtime loads. Local uploads use a synthetic same-origin URL
   * (`/__dirplayer-blob/...`) backed by the Cache API — `blob:` URLs panic
   * in DirPlayer's WASM `get_base_url`.
   */
  dcrUrl: string;
  /** Filename of the .dcr — useful for diagnostics and base-path heuristics. */
  dcrName: string;
  /**
   * Optional external cast (typically sound.cct). The runtime may need this
   * registered under its original filename to satisfy `castLib("sound")`
   * lookups inside the movie.
   */
  cct?: CastAsset;
  stage?: { width: number; height: number };
  /**
   * Hint for the runtime about where relative asset references should resolve.
   * For object-URL uploads this is mostly informational.
   */
  basePath?: string;
  /** Forward script errors / movie events back to the app. */
  onError?: (err: unknown) => void;
  onMovieLoaded?: (info: { version?: number }) => void;
}

export interface MountedInstance {
  /** Idempotent. Tears down listeners, DOM, and any runtime resources. */
  destroy: () => Promise<void>;
  /**
   * The actual host element the runtime mounted into. May differ from the
   * container the caller passed (e.g. an inner sized div).
   */
  host: HTMLElement;
  /** What we found on `window` at mount time, if anything. */
  runtimeKey: string | null;
}

/**
 * The slim runtime surface we *call into*. We deliberately keep this loose —
 * the real polyfill exposes a wider API, but anything beyond these methods is
 * an internal detail and should stay inside dirPlayerMount.ts.
 */
export interface DirPlayerRuntime {
  /** Official polyfill API: `DirPlayer.init()` — usually already run on script load. */
  init?: () => void;
  load_movie_file?: (url: string, opts?: unknown) => unknown;
  loadMovieFile?: (url: string, opts?: unknown) => unknown;
  set_base_path?: (path: string) => void;
  setBasePath?: (path: string) => void;
  set_stage_size?: (w: number, h: number) => void;
  setStageSize?: (w: number, h: number) => void;
  set_external_params?: (params: unknown) => void;
  destroy?: () => void;
}

export type LoaderResult =
  | { status: 'ready'; runtime: DirPlayerRuntime | null; runtimeKey: string | null }
  | { status: 'script-missing' }
  | { status: 'loaded-no-global' }
  | { status: 'error'; error: unknown };
