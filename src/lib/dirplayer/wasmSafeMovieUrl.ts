/**
 * DirPlayer's WASM calls `get_base_url()` using Rust's `url` crate. `blob:`
 * URLs are not valid bases (`RelativeUrlWithCannotBeABaseBase`). We expose the
 * upload as a synthetic same-origin path and store the bytes in the Cache API;
 * `public/dirplayer-blob-sw.js` serves them without hitting the static host.
 *
 * External casts (e.g. `sound.cct`) resolve relative to the movie URL, so they
 * must live under the **same** `/__dirplayer-blob/<uuid>/` prefix as the `.dcr`.
 */

export const DIRPLAYER_BLOB_PATH_PREFIX = '/__dirplayer-blob';

const SW_SCRIPT = '/dirplayer-blob-sw.js';

/** Set after we trigger a one-time reload so uncontrolled clients attach to the active worker. */
const SW_CONTROL_BOOTSTRAP_KEY = 'dirplayer-sw-control-bootstrap';

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

  if (navigator.serviceWorker.controller) {
    try {
      sessionStorage.removeItem(SW_CONTROL_BOOTSTRAP_KEY);
    } catch {
      /* private mode / blocked */
    }
    return reg;
  }

  // First session after install: an active worker exists but this document was created
  // before clients.claim() — fetches skip the SW and get SPA HTML. One reload fixes it.
  if (reg.active) {
    try {
      if (sessionStorage.getItem(SW_CONTROL_BOOTSTRAP_KEY) !== '1') {
        sessionStorage.setItem(SW_CONTROL_BOOTSTRAP_KEY, '1');
        globalThis.location.reload();
        await new Promise<never>(() => {});
      }
    } catch {
      /* sessionStorage unavailable */
    }
  }

  return reg;
}

const VERIFY_PREFIX_LEN = 128;

async function readResponsePrefix(url: string, maxBytes: number): Promise<Uint8Array> {
  const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) {
    throw new Error(
      `Blob proxy request failed (${res.status} ${res.statusText}). The Service Worker may not be serving /__dirplayer-blob/ — reload and try again.`,
    );
  }
  const reader = res.body?.getReader();
  if (!reader) {
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab.slice(0, maxBytes));
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value?.length) {
      break;
    }
    chunks.push(value);
    total += value.length;
  }
  try {
    await reader.cancel();
  } catch {
    /* ignore */
  }
  const merged = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const c of chunks) {
    const need = maxBytes - offset;
    if (need <= 0) {
      break;
    }
    const take = Math.min(c.length, need);
    merged.set(c.subarray(0, take), offset);
    offset += take;
  }
  return merged.subarray(0, offset);
}

/** Ensures `fetch(movieUrl)` returns the same leading bytes as `file` (SW actually serves the cache). */
async function assertCachedUrlMatchesFile(httpUrl: string, file: File, role: 'movie' | 'cast'): Promise<void> {
  const [fromNet, fromFile] = await Promise.all([
    readResponsePrefix(httpUrl, VERIFY_PREFIX_LEN),
    file.slice(0, VERIFY_PREFIX_LEN).arrayBuffer().then((ab) => new Uint8Array(ab)),
  ]);
  const n = Math.min(fromNet.length, fromFile.length);
  for (let i = 0; i < n; i++) {
    if (fromNet[i] !== fromFile[i]) {
      const netSnippet = String.fromCharCode(...fromNet.subarray(0, Math.min(8, fromNet.length)));
      const fileSnippet = String.fromCharCode(...fromFile.subarray(0, Math.min(8, fromFile.length)));
      throw new Error(
        `The ${role} URL did not return your uploaded bytes (prefix mismatch at byte ${i}: network ${JSON.stringify(netSnippet)}… vs file ${JSON.stringify(fileSnippet)}…). ` +
          `Usually the Service Worker is not intercepting requests yet — reload the page once, then Load again. ` +
          `If this persists, check DevTools → Application → Service Workers that dirplayer-blob-sw.js is active.`,
      );
    }
  }
  if (fromNet.length === 0 && file.size > 0) {
    throw new Error(`Empty response from blob proxy for ${role}. Reload and try again.`);
  }
}

function cacheableHttpUrl(sessionId: string, logicalName: string): string {
  const name = encodeURIComponent(logicalName);
  return `${globalThis.location.origin}${DIRPLAYER_BLOB_PATH_PREFIX}/${sessionId}/${name}`;
}

async function putInBlobCache(httpUrl: string, file: File, contentType: string): Promise<void> {
  const cache = await caches.open('dirplayer-blob-v1');
  await cache.put(
    new Request(httpUrl, { credentials: 'same-origin' }),
    new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    }),
  );
}

export interface WasmSafeBlobSessionInput {
  movie: { file: File; objectUrl: string };
  /** Same-origin sibling files (e.g. sound.cct) resolved relative to the movie URL. */
  cast?: { file: File; objectUrl: string; name: string } | null;
}

export interface WasmSafeBlobSessionResult {
  /** Pass this to DirPlayer as the movie URL. */
  movieHttpUrl: string;
  /** Every synthetic URL registered — revoke all on teardown. */
  cachedHttpUrls: string[];
}

/**
 * Register one or more `blob:` uploads under a shared `/__dirplayer-blob/<uuid>/`
 * prefix so relative loads like `sound.cct` hit the Cache API.
 */
export async function ensureWasmSafeBlobSession(
  input: WasmSafeBlobSessionInput,
): Promise<WasmSafeBlobSessionResult> {
  const { movie, cast } = input;

  if (!movie.objectUrl.startsWith('blob:')) {
    return { movieHttpUrl: movie.objectUrl, cachedHttpUrls: [] };
  }

  await ensureSwRegistered();

  const id = crypto.randomUUID();
  const cachedHttpUrls: string[] = [];

  const movieName = dcrFilename(movie.file);
  const movieUrl = cacheableHttpUrl(id, movieName);
  await putInBlobCache(movieUrl, movie.file, 'application/x-director');
  await assertCachedUrlMatchesFile(movieUrl, movie.file, 'movie');
  cachedHttpUrls.push(movieUrl);

  if (cast?.objectUrl.startsWith('blob:')) {
    const castLogicalName = cast.name.trim() || cast.file.name;
    const castUrl = cacheableHttpUrl(id, castLogicalName);
    await putInBlobCache(castUrl, cast.file, 'application/x-director');
    await assertCachedUrlMatchesFile(castUrl, cast.file, 'cast');
    cachedHttpUrls.push(castUrl);
  }

  return { movieHttpUrl: movieUrl, cachedHttpUrls };
}

/**
 * For `blob:` object URLs, register the file under a synthetic `http(s)` URL
 * and return that URL. For non-blob URLs (e.g. already https), returns as-is.
 *
 * Prefer [`ensureWasmSafeBlobSession`] when an external `.cct` must share the
 * same base path as the movie.
 */
export async function ensureWasmSafeDcrUrl(file: File, objectUrl: string): Promise<string> {
  const { movieHttpUrl } = await ensureWasmSafeBlobSession({
    movie: { file, objectUrl },
    cast: null,
  });
  return movieHttpUrl;
}

/** Remove synthetic cache entries (best-effort). */
export async function revokeWasmSafeBlobUrls(httpUrls: string[]): Promise<void> {
  const cache = await caches.open('dirplayer-blob-v1');
  for (const httpUrl of httpUrls) {
    if (!httpUrl.includes(DIRPLAYER_BLOB_PATH_PREFIX)) continue;
    try {
      await cache.delete(new Request(httpUrl, { credentials: 'same-origin' }));
    } catch {
      /* ignore */
    }
  }
}

/** @deprecated Use [`revokeWasmSafeBlobUrls`] for multi-file sessions. */
export async function revokeWasmSafeDcrUrl(httpUrl: string): Promise<void> {
  await revokeWasmSafeBlobUrls([httpUrl]);
}
