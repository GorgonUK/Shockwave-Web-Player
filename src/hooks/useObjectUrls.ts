import { useCallback, useEffect, useRef } from 'react';

/**
 * Manages object URL lifecycles. Creating a URL registers it; releasing it (or
 * unmounting the hook) revokes it. Prevents leaks when assets are replaced.
 */
export function useObjectUrls() {
  const urls = useRef(new Set<string>());

  const create = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    return url;
  }, []);

  const release = useCallback((url: string | null | undefined): void => {
    if (!url) return;
    if (urls.current.has(url)) {
      urls.current.delete(url);
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* noop */
      }
    }
  }, []);

  const releaseAll = useCallback((): void => {
    for (const url of urls.current) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* noop */
      }
    }
    urls.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      releaseAll();
    };
  }, [releaseAll]);

  return { create, release, releaseAll };
}
