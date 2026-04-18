/**
 * DirPlayer's WASM calls `get_base_url()` using Rust's `url` crate. `blob:`
 * URLs are not valid bases (`RelativeUrlWithCannotBeABaseBase`). We expose the
 * upload as a synthetic same-origin path and store the bytes in the Cache API;
 * `public/dirplayer-blob-sw.js` serves them without hitting the static host.
 */

export const DIRPLAYER_BLOB_PATH_PREFIX = '/__dirplayer-blob';

const SW_SCRIPT = '/dirplayer-blob-sw.js';

function dcrFilename(file: File): string {
  const n = file.name.trim();
  if (n.toLowerCase().endsWith('.dcr')) return n;
  const base = n.replace(/\.[^/.]+$/, '') || 'movie';
  return `${base}.dcr`;
}

let swRegistration: Promise<ServiceWorkerRegistration | null> | null = null;

async function ensureSwRegistered(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error(
      'Service Workers are not available. DirPlayer needs a same-origin HTTP URL for your .dcr (use a browser that supports Service Workers).',
    );
  }
  if (!swRegistration) {
    swRegistration = navigator.serviceWorker.register(SW_SCRIPT, { scope: '/' }).catch((e) => {
      swRegistration = null;
      throw e instanceof Error ? e : new Error(String(e));
    });
  }
  const reg = await swRegistration;
  if (!reg) {
    throw new Error('Service Worker registration failed.');
  }
  await navigator.serviceWorker.ready;
  return reg;
}

/**
 * For `blob:` object URLs, register the file under a synthetic `http(s)` URL
 * and return that URL. For non-blob URLs (e.g. already https), returns as-is.
 */
export async function ensureWasmSafeDcrUrl(file: File, objectUrl: string): Promise<string> {
  if (!objectUrl.startsWith('blob:')) {
    return objectUrl;
  }

  await ensureSwRegistered();

  const id = crypto.randomUUID();
  const name = encodeURIComponent(dcrFilename(file));
  const url = `${globalThis.location.origin}${DIRPLAYER_BLOB_PATH_PREFIX}/${id}/${name}`;

  const cache = await caches.open('dirplayer-blob-v1');
  await cache.put(
    new Request(url, { credentials: 'same-origin' }),
    new Response(file, {
      headers: {
        'Content-Type': 'application/x-director',
        'Cache-Control': 'no-store',
      },
    }),
  );

  return url;
}

/** Remove a synthetic entry (best-effort) when tearing down a run. */
export async function revokeWasmSafeDcrUrl(httpUrl: string): Promise<void> {
  if (!httpUrl.includes(DIRPLAYER_BLOB_PATH_PREFIX)) return;
  try {
    const cache = await caches.open('dirplayer-blob-v1');
    await cache.delete(new Request(httpUrl, { credentials: 'same-origin' }));
  } catch {
    /* ignore */
  }
}
