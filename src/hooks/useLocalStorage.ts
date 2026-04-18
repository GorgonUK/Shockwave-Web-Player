import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tiny typed localStorage hook. Quietly no-ops in non-browser / private modes.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const isBrowser = typeof window !== 'undefined';
  const initialRef = useRef(initialValue);

  const [value, setValue] = useState<T>(() => {
    if (!isBrowser) return initialRef.current;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialRef.current;
      return JSON.parse(raw) as T;
    } catch {
      return initialRef.current;
    }
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          if (isBrowser) window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* quota / SecurityError — ignore */
        }
        return resolved;
      });
    },
    [isBrowser, key],
  );

  // Sync across tabs.
  useEffect(() => {
    if (!isBrowser) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setValue(JSON.parse(e.newValue) as T);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isBrowser, key]);

  return [value, set];
}
