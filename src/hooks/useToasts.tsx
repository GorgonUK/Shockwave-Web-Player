import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createId } from '@/lib/utils/ids';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  /** Auto-dismiss ms, 0 = sticky. Defaults to 4500ms. */
  duration?: number;
}

interface ToastsContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastsContext = createContext<ToastsContextValue | null>(null);

export function ToastsProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = createId('toast');
      const next: Toast = { id, duration: 4500, ...toast };
      setToasts((prev) => [...prev, next]);
      const duration = next.duration ?? 4500;
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  const clear = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    const localTimers = timers.current;
    return () => {
      localTimers.forEach((t) => clearTimeout(t));
      localTimers.clear();
    };
  }, []);

  const value = useMemo(() => ({ toasts, push, dismiss, clear }), [toasts, push, dismiss, clear]);
  return <ToastsContext.Provider value={value}>{children}</ToastsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToasts(): ToastsContextValue {
  const ctx = useContext(ToastsContext);
  if (!ctx) throw new Error('useToasts must be used inside <ToastsProvider>');
  return ctx;
}
