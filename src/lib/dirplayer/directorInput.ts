/**
 * Focus + optional input tracing for the DirPlayer stage (keyboard needs focus on
 * `#stage_canvas_container`; pointer events use the same element for coordinates).
 */

const TRACE_PARAM = 'dirplayerTraceInput';
const TRACE_LS = 'dirplayerTraceInput';

export function isDirectorInputTraceEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get(TRACE_PARAM) === '1') {
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem(TRACE_LS) === '1';
  } catch {
    return false;
  }
}

/** Focus the polyfill stage so `onKeyDown` on `#stage_canvas_container` receives keys. */
export function focusDirectorStage(mountRoot: HTMLElement | null | undefined): void {
  if (!mountRoot) return;
  const el = mountRoot.querySelector('#stage_canvas_container');
  if (!(el instanceof HTMLElement)) return;
  try {
    if (!el.hasAttribute('tabindex')) {
      el.tabIndex = 0;
    }
    el.focus({ preventScroll: true });
  } catch {
    /* ignore */
  }
}

/**
 * Logs pointer and key events when URL has `?dirplayerTraceInput=1` or
 * `localStorage.dirplayerTraceInput = "1"`.
 */
export function attachDirectorInputTrace(mountRoot: HTMLElement): () => void {
  if (!isDirectorInputTraceEnabled()) {
    return () => {};
  }

  const prefix = '[DirPlayer input trace]';

  const onPointer = (e: PointerEvent) => {
    if (!mountRoot.contains(e.target as Node)) return;
    const stage = mountRoot.querySelector('#stage_canvas_container');
    const tag = e.target instanceof HTMLElement ? e.target.tagName : '?';
    // eslint-disable-next-line no-console
    console.info(prefix, e.type, {
      targetTag: tag,
      client: { x: e.clientX, y: e.clientY },
      button: e.button,
      buttons: e.buttons,
    });
    if (stage instanceof HTMLElement) {
      const r = stage.getBoundingClientRect();
      // eslint-disable-next-line no-console
      console.info(prefix, 'offsetInStage', {
        x: Math.round(e.clientX - r.left),
        y: Math.round(e.clientY - r.top),
        stageCss: { w: Math.round(r.width), h: Math.round(r.height) },
        documentActiveElement: document.activeElement?.id ?? document.activeElement?.nodeName,
      });
    }
  };

  const onKeyDoc = (e: KeyboardEvent) => {
    if (e.type !== 'keydown') return;
    const stage = mountRoot.querySelector('#stage_canvas_container');
    const onStage = stage instanceof HTMLElement && document.activeElement === stage;
    // eslint-disable-next-line no-console
    console.info(prefix, 'keydown', {
      key: e.key,
      code: e.code,
      activeIsStage: onStage,
      active: document.activeElement?.nodeName,
    });
  };

  mountRoot.addEventListener('pointerdown', onPointer, true);
  mountRoot.addEventListener('pointerup', onPointer, true);
  document.addEventListener('keydown', onKeyDoc, true);

  return () => {
    mountRoot.removeEventListener('pointerdown', onPointer, true);
    mountRoot.removeEventListener('pointerup', onPointer, true);
    document.removeEventListener('keydown', onKeyDoc, true);
  };
}
