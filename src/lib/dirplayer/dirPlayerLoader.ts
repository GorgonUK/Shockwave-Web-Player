import {
  GLOBAL_PROBE_KEYS,
  POLYFILL_SCRIPT_ID,
  POLYFILL_SRC,
  REQUIRE_GLOBAL_FOR_READY,
} from './constants';
import type { DirPlayerRuntime, LoaderResult } from './types';

/**
 * Idempotent loader for the DirPlayer polyfill bundle.
 *
 * Resolves to a structured result instead of throwing for the common
 * "polyfill not installed yet" case — that one is a normal UI state, not
 * an exception.
 */

let pending: Promise<LoaderResult> | null = null;
let cached: LoaderResult | null = null;

export function getCachedLoaderResult(): LoaderResult | null {
  return cached;
}

export function resetLoaderCache(): void {
  pending = null;
  cached = null;
  // Note: we do NOT remove the script tag — once a bundle is parsed the
  // browser cannot meaningfully un-execute it. Re-injection is a no-op.
}

export async function ensurePolyfillLoaded(): Promise<LoaderResult> {
  if (cached) return cached;
  if (pending) return pending;

  pending = (async (): Promise<LoaderResult> => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { status: 'error', error: new Error('Not in a browser environment') };
    }

    // 1. Probe the URL first so we can distinguish "404" from "loaded but no global".
    const headOk = await scriptUrlExists(POLYFILL_SRC);
    if (!headOk) {
      const result: LoaderResult = { status: 'script-missing' };
      cached = result;
      return result;
    }

    // 2. Inject (once).
    try {
      await injectScriptOnce(POLYFILL_SRC, POLYFILL_SCRIPT_ID);
    } catch (error) {
      const result: LoaderResult = { status: 'error', error };
      cached = result;
      return result;
    }

    // 3. Probe globals.
    const probe = probeRuntime();
    if (!probe.runtime && REQUIRE_GLOBAL_FOR_READY) {
      const result: LoaderResult = { status: 'loaded-no-global' };
      cached = result;
      return result;
    }

    const result: LoaderResult = {
      status: 'ready',
      runtime: probe.runtime,
      runtimeKey: probe.key,
    };
    cached = result;
    return result;
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

async function scriptUrlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    // CORS or offline — fall back to optimistic injection.
    return true;
  }
}

function injectScriptOnce(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      // Already present — assume executed.
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

function probeRuntime(): { runtime: DirPlayerRuntime | null; key: string | null } {
  if (typeof window === 'undefined') return { runtime: null, key: null };
  for (const key of GLOBAL_PROBE_KEYS) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value && typeof value === 'object') {
      return { runtime: value as DirPlayerRuntime, key };
    }
  }
  return { runtime: null, key: null };
}
