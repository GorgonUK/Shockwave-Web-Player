import { DEFAULT_STAGE } from './constants';
import { ensurePolyfillLoaded } from './dirPlayerLoader';
import type { DirPlayerRuntime, MountConfig, MountedInstance } from './types';

/**
 * Insert a legacy Shockwave `<object>` so the polyfill's `Ga()` / mutation
 * observer picks it up (`UM` → `JM`).
 *
 * We use the **Director classid** + `<param name="src" value="…">` because:
 * - `<embed>` is only hooked when `embed.src.endsWith(".dcr")` (`cM` in the bundle).
 * - Appending `#movie.dcr` to a `blob:` URL fixed that check but broke the VM:
 *   Rust's `get_base_url` then hits `RelativeUrlWithCannotBeABaseBase` (hash /
 *   blob base resolution).
 * - For `<object>`, `aM` sets `isDirObject` from **classid** OR `.dcr` param —
 *   so a plain `blob:` URL (no fragment) is valid for discovery and for the VM.
 */
function mountViaShockwaveObject(host: HTMLElement, config: MountConfig): boolean {
  const stage = config.stage ?? DEFAULT_STAGE;
  const clsid = 'clsid:166B1BCA-3F9C-11CF-8075-444553540000';

  const obj = document.createElement('object');
  obj.setAttribute('classid', clsid);
  obj.setAttribute('type', 'application/x-director');
  obj.setAttribute('width', String(stage.width));
  obj.setAttribute('height', String(stage.height));
  obj.style.width = '100%';
  obj.style.height = '100%';
  obj.style.display = 'block';
  obj.setAttribute('data-shockwave-web-player', '1');

  const param = document.createElement('param');
  param.setAttribute('name', 'src');
  param.setAttribute('value', config.dcrUrl);
  obj.appendChild(param);

  host.appendChild(obj);
  return true;
}

/**
 * Mount the Director movie into the given container via the DirPlayer
 * polyfill. This is the *only* place in the app that knows how to talk to
 * the runtime — the rest of the codebase only sees `MountConfig` and
 * `MountedInstance`.
 *
 * Today this builds the hosting DOM and best-effort calls a few common
 * runtime entry points behind try/catch. Once the polyfill's actual API is
 * confirmed, fill in the three TODO blocks below.
 */
export async function mountDirPlayer(config: MountConfig): Promise<MountedInstance> {
  const loader = await ensurePolyfillLoaded();

  // Always build the host DOM, even if the runtime is missing — so the user
  // sees a polished placeholder explaining the situation, not a blank box.
  const host = buildHost(config.container);

  if (loader.status !== 'ready') {
    renderPolyfillFallback(host, loader.status);
    return {
      host,
      runtimeKey: null,
      destroy: async () => {
        teardownHost(config.container);
      },
    };
  }

  const runtime: DirPlayerRuntime | null = loader.runtime;
  const runtimeKey = loader.runtimeKey;

  // ---------------------------------------------------------------------
  // Official dirplayer-rs polyfill: window.DirPlayer = { init }; DOM-driven
  // <object>/<embed> replacement — see mountViaShockwaveObject() above.
  // ---------------------------------------------------------------------
  let mountedViaPolyfillDom = false;
  try {
    mountedViaPolyfillDom = mountViaShockwaveObject(host, config);
  } catch (err) {
    config.onError?.(err);
    renderErrorState(host, err);
  }

  // ---------------------------------------------------------------------
  // TODO(DirPlayer) #1 — base path / external cast registry
  // ---------------------------------------------------------------------
  try {
    if (config.basePath) {
      runtime?.set_base_path?.(config.basePath);
      runtime?.setBasePath?.(config.basePath);
    }
    if (config.cct) {
      // e.g. runtime?.register_external_cast?.(config.cct.name, config.cct.url);
    }
  } catch (err) {
    config.onError?.(err);
  }

  // ---------------------------------------------------------------------
  // TODO(DirPlayer) #2 — optional imperative loader (non-standard / future)
  // ---------------------------------------------------------------------
  try {
    if (!mountedViaPolyfillDom) {
      const loaderFn = runtime?.load_movie_file ?? runtime?.loadMovieFile;
      if (typeof loaderFn === 'function') {
        loaderFn.call(runtime, config.dcrUrl);
      } else {
        renderRuntimeFallback(host, runtimeKey);
      }
    }
  } catch (err) {
    config.onError?.(err);
    renderErrorState(host, err);
  }

  // ---------------------------------------------------------------------
  // TODO(DirPlayer) #3 — wire stage size + input bridges (if needed)
  // ---------------------------------------------------------------------
  // Some bundles auto-attach mouse/keyboard listeners; others expect the
  // host page to forward events via `mouse_down(x, y)`, `key_down(code)`,
  // etc. Confirm and wire here. Stage size can also be applied:
  try {
    const stage = config.stage ?? DEFAULT_STAGE;
    runtime?.set_stage_size?.(stage.width, stage.height);
    runtime?.setStageSize?.(stage.width, stage.height);
  } catch (err) {
    config.onError?.(err);
  }

  return {
    host,
    runtimeKey,
    destroy: async () => {
      try {
        runtime?.destroy?.();
      } catch {
        /* swallow — destroy must always succeed for cleanup */
      }
      teardownHost(config.container);
    },
  };
}

/* ------------------------------------------------------------------ */
/* DOM helpers                                                         */
/* ------------------------------------------------------------------ */

function buildHost(container: HTMLElement): HTMLElement {
  // Wipe any previous content first to guarantee a clean slate.
  while (container.firstChild) container.removeChild(container.firstChild);

  const host = document.createElement('div');
  host.dataset.dirplayerHost = 'true';
  host.style.position = 'absolute';
  host.style.inset = '0';
  /** Block layout so the polyfill root can fill the host; flex centering kept a 640×480 stage in the middle and clicks on the black margin never reached #stage_canvas_container. */
  host.style.display = 'block';
  host.style.background = '#000';
  host.style.overflow = 'hidden';
  host.style.minHeight = '0';
  // Do not set aspect-ratio here: PlayerViewport already constrains the mount box (4:3).
  // A second aspect-ratio on this absolutely positioned host can collapse height in some layouts.

  container.appendChild(host);
  return host;
}

function teardownHost(container: HTMLElement): void {
  while (container.firstChild) container.removeChild(container.firstChild);
}

function renderPolyfillFallback(
  host: HTMLElement,
  status: 'script-missing' | 'loaded-no-global' | 'error',
): void {
  host.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.padding = '24px';
  wrap.style.maxWidth = '420px';
  wrap.style.textAlign = 'center';
  wrap.style.color = '#cfd3dc';
  wrap.style.fontFamily =
    '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  wrap.style.fontSize = '13px';
  wrap.style.lineHeight = '1.55';

  const title = document.createElement('div');
  title.style.fontSize = '15px';
  title.style.fontWeight = '600';
  title.style.color = '#fff';
  title.style.marginBottom = '6px';
  title.textContent =
    status === 'script-missing'
      ? 'DirPlayer polyfill not installed yet'
      : 'DirPlayer runtime not detected';

  const body = document.createElement('div');
  body.style.opacity = '0.75';
  body.textContent =
    status === 'script-missing'
      ? 'Drop the polyfill bundle into /public/dirplayer/dirplayer-polyfill.js to enable playback. The app is wired and ready.'
      : 'The script loaded but did not expose a known runtime global. Update GLOBAL_PROBE_KEYS in src/lib/dirplayer/constants.ts.';

  wrap.append(title, body);
  host.appendChild(wrap);
}

function renderRuntimeFallback(host: HTMLElement, runtimeKey: string | null): void {
  host.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.padding = '24px';
  wrap.style.maxWidth = '420px';
  wrap.style.textAlign = 'center';
  wrap.style.color = '#cfd3dc';
  wrap.style.fontFamily =
    '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  wrap.style.fontSize = '13px';

  const title = document.createElement('div');
  title.style.fontSize = '15px';
  title.style.fontWeight = '600';
  title.style.color = '#fff';
  title.style.marginBottom = '6px';
  title.textContent = 'No supported loader entry point';

  const body = document.createElement('div');
  body.style.opacity = '0.75';
  body.innerHTML =
    `Found <code style="color:#a594ff">window.${runtimeKey ?? 'unknown'}</code> but neither a Shockwave DOM mount nor <code>load_movie_file</code> / <code>loadMovieFile</code> is available. ` +
    `The polyfill replaces legacy <code>&lt;object classid=…&gt;</code> / <code>&lt;embed&gt;</code> tags after <code>DirPlayer.init()</code>.`;

  wrap.append(title, body);
  host.appendChild(wrap);
}

function renderErrorState(host: HTMLElement, err: unknown): void {
  host.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.padding = '24px';
  wrap.style.maxWidth = '440px';
  wrap.style.textAlign = 'center';
  wrap.style.color = '#fda4a4';
  wrap.style.fontFamily =
    '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  wrap.style.fontSize = '13px';

  const title = document.createElement('div');
  title.style.fontWeight = '600';
  title.style.color = '#fecaca';
  title.style.marginBottom = '6px';
  title.textContent = 'Runtime error during mount';

  const body = document.createElement('div');
  body.style.opacity = '0.85';
  body.textContent =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';

  wrap.append(title, body);
  host.appendChild(wrap);
}
