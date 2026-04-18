/**
 * Intercepts DirPlayer's `alert('Script error: …')` path so we can surface
 * structured diagnostics without relying on minified Redux internals.
 *
 * Install once at app bootstrap — idempotent.
 */

export const DIRPLAYER_SCRIPT_ERROR_EVENT = 'shockwave-web-player:dirplayer-script-error';
export const DIRPLAYER_DEBUG_MESSAGE_EVENT = 'shockwave-web-player:dirplayer-debug-message';

export interface DirPlayerScriptErrorDetail {
  raw: string;
  source: 'alert';
}

export interface DirPlayerDebugMessageDetail {
  message: string;
  source: 'dirplayer-js-api';
}

let installed = false;

export function installDirPlayerScriptErrorBridge(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  const orig = window.alert.bind(window);
  window.alert = (message?: unknown) => {
    const s = typeof message === 'string' ? message : String(message ?? '');
    if (s.startsWith('Script error:')) {
      const raw = s.slice('Script error:'.length).trim();
      window.dispatchEvent(
        new CustomEvent<DirPlayerScriptErrorDetail>(DIRPLAYER_SCRIPT_ERROR_EVENT, {
          detail: { raw, source: 'alert' },
        }),
      );
    }
    return orig(message);
  };
}
