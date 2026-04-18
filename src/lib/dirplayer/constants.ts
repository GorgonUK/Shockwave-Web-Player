/**
 * Single source of truth for the polyfill location and probe surface.
 *
 * If the polyfill bundle gets renamed (e.g. a new version `dirplayer-polyfill-0.5.0.js`),
 * just update POLYFILL_SRC here — nothing else in the app should know the URL.
 */
export const POLYFILL_SRC = '/dirplayer/dirplayer-polyfill.js';

export const POLYFILL_SCRIPT_ID = 'dirplayer-polyfill-script';

/**
 * Probed in order to detect "is the polyfill present and exposing a runtime?".
 * Real builds may attach to one of these globals; we accept any of them and
 * report which one was found in diagnostics.
 *
 * TODO(DirPlayer): once we know the actual global the bundle exposes, narrow
 * this list and update GLOBAL_PROBE_KEYS to the canonical name only.
 */
export const GLOBAL_PROBE_KEYS = [
  'DirPlayer',
  'dirPlayer',
  '__DIRPLAYER__',
  'dirplayer',
] as const;

/**
 * If the polyfill exposes nothing global (it might bootstrap itself by
 * scanning the DOM), we still consider it "ready" once the script tag has
 * loaded. This flag controls whether a missing global flips us to
 * 'loaded-no-global' (true, stricter) or 'ready' (false, looser).
 */
export const REQUIRE_GLOBAL_FOR_READY = false;

/** Default stage size used when the .dcr does not declare one (4:3, classic Director). */
export const DEFAULT_STAGE = { width: 640, height: 480 } as const;
