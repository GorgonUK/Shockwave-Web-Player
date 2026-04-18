/**
 * Single source of truth for the browser runtime bundle and probe surface.
 *
 * We keep two runtime slots:
 * - `upstream`: the checked-in upstream bundle
 * - `local`: a locally rebuilt / patched bundle copied from `vendor/dirplayer-rs`
 *
 * Switch between them with `VITE_DIRPLAYER_RUNTIME_SOURCE=upstream|local`.
 *
 * Default is `local` because it includes compatibility fixes (e.g. `getPos`)
 * needed by some shipped games.
 */
export const DIRPLAYER_RUNTIME_SOURCES = {
  upstream: '/dirplayer/dirplayer-polyfill.js',
  local: '/dirplayer/dirplayer-polyfill.local.js',
} as const;

export type DirPlayerRuntimeSource = keyof typeof DIRPLAYER_RUNTIME_SOURCES;

function resolveRuntimeSource(): DirPlayerRuntimeSource {
  const requested = import.meta.env.VITE_DIRPLAYER_RUNTIME_SOURCE?.trim().toLowerCase();
  if (requested === 'upstream') return 'upstream';
  return 'local';
}

export const DIRPLAYER_RUNTIME_SOURCE = resolveRuntimeSource();
export const POLYFILL_SRC = DIRPLAYER_RUNTIME_SOURCES[DIRPLAYER_RUNTIME_SOURCE];

/**
 * Must vary with {@link DIRPLAYER_RUNTIME_SOURCE}: same DOM id + different URL would
 * otherwise skip injection and leave the previous WASM bundle active after a switch.
 */
export const POLYFILL_SCRIPT_ID = `dirplayer-polyfill-script-${DIRPLAYER_RUNTIME_SOURCE}` as const;

/**
 * Probed in order to detect "is the polyfill present and exposing a runtime?".
 * The current bundle exposes `window.DirPlayer`, but we keep a narrow fallback
 * list so diagnostics stay useful while iterating on local builds.
 */
export const GLOBAL_PROBE_KEYS = ['DirPlayer', 'dirPlayer', '__DIRPLAYER__', 'dirplayer'] as const;

/**
 * If the polyfill exposes nothing global (it might bootstrap itself by
 * scanning the DOM), we still consider it "ready" once the script tag has
 * loaded. This flag controls whether a missing global flips us to
 * `loaded-no-global` (true, stricter) or `ready` (false, looser).
 */
export const REQUIRE_GLOBAL_FOR_READY = false;

/** Default stage size used when the .dcr does not declare one (4:3, classic Director). */
export const DEFAULT_STAGE = { width: 640, height: 480 } as const;
