import { useCallback, useEffect, useState, type RefObject } from 'react';

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const el = ref.current as FullscreenElement | null;
    const doc = document as FullscreenDocument;
    setSupported(
      Boolean(
        (el && (el.requestFullscreen || el.webkitRequestFullscreen)) ||
        doc.documentElement?.requestFullscreen,
      ),
    );

    const onChange = () => {
      const active = Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(active);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange as EventListener);
    };
  }, [ref]);

  const enter = useCallback(async () => {
    const el = ref.current as FullscreenElement | null;
    if (!el) return;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Fullscreen request failed');
    }
  }, [ref]);

  const exit = useCallback(async () => {
    const doc = document as FullscreenDocument;
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Exit fullscreen failed');
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isFullscreen) await exit();
    else await enter();
  }, [enter, exit, isFullscreen]);

  return { isFullscreen, supported, enter, exit, toggle };
}
