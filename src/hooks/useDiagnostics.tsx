import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createId } from '@/lib/utils/ids';
import type {
  DiagnosticsErrorEntry,
  RuntimeScriptEventEntry,
  RuntimeTraceEventEntry,
} from '@/types/diagnostics';

interface DiagnosticsContextValue {
  errors: DiagnosticsErrorEntry[];
  runtimeScriptEvents: RuntimeScriptEventEntry[];
  runtimeTraceEvents: RuntimeTraceEventEntry[];
  recordError: (entry: Omit<DiagnosticsErrorEntry, 'id' | 'at'>) => void;
  recordRuntimeScriptEvent: (entry: Omit<RuntimeScriptEventEntry, 'id' | 'at'>) => void;
  recordRuntimeTraceEvent: (entry: Omit<RuntimeTraceEventEntry, 'id' | 'at'>) => void;
  clearErrors: () => void;
  clearRuntimeScriptEvents: () => void;
  clearRuntimeTraceEvents: () => void;
  clearAllDiagnostics: () => void;
}

const DiagnosticsContext = createContext<DiagnosticsContextValue | null>(null);

const MAX_ERRORS = 25;
const MAX_RUNTIME = 40;
const MAX_RUNTIME_TRACE = 60;

export function DiagnosticsProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<DiagnosticsErrorEntry[]>([]);
  const [runtimeScriptEvents, setRuntimeScriptEvents] = useState<RuntimeScriptEventEntry[]>([]);
  const [runtimeTraceEvents, setRuntimeTraceEvents] = useState<RuntimeTraceEventEntry[]>([]);

  const recordError = useCallback((entry: Omit<DiagnosticsErrorEntry, 'id' | 'at'>) => {
    setErrors((prev) =>
      [{ ...entry, id: createId('err'), at: Date.now() }, ...prev].slice(0, MAX_ERRORS),
    );
  }, []);

  const recordRuntimeScriptEvent = useCallback(
    (entry: Omit<RuntimeScriptEventEntry, 'id' | 'at'>) => {
      setRuntimeScriptEvents((prev) => {
        const next: RuntimeScriptEventEntry = {
          ...entry,
          id: createId('rt'),
          at: Date.now(),
        };
        const key =
          next.parsed.kind === 'missing-builtin'
            ? `mb:${next.parsed.handlerName}`
            : `raw:${next.rawMessage.slice(0, 120)}`;
        const sameCount = prev.filter((p) => {
          const pk =
            p.parsed.kind === 'missing-builtin'
              ? `mb:${p.parsed.handlerName}`
              : `raw:${p.rawMessage.slice(0, 120)}`;
          return pk === key;
        }).length;
        next.occurrenceIndex = sameCount;
        return [next, ...prev].slice(0, MAX_RUNTIME);
      });
    },
    [],
  );

  const recordRuntimeTraceEvent = useCallback(
    (entry: Omit<RuntimeTraceEventEntry, 'id' | 'at'>) => {
      setRuntimeTraceEvents((prev) =>
        [{ ...entry, id: createId('trace'), at: Date.now() }, ...prev].slice(0, MAX_RUNTIME_TRACE),
      );
    },
    [],
  );

  const clearErrors = useCallback(() => setErrors([]), []);
  const clearRuntimeScriptEvents = useCallback(() => setRuntimeScriptEvents([]), []);
  const clearRuntimeTraceEvents = useCallback(() => setRuntimeTraceEvents([]), []);
  const clearAllDiagnostics = useCallback(() => {
    setErrors([]);
    setRuntimeScriptEvents([]);
    setRuntimeTraceEvents([]);
  }, []);

  const value = useMemo(
    () => ({
      errors,
      runtimeScriptEvents,
      runtimeTraceEvents,
      recordError,
      recordRuntimeScriptEvent,
      recordRuntimeTraceEvent,
      clearErrors,
      clearRuntimeScriptEvents,
      clearRuntimeTraceEvents,
      clearAllDiagnostics,
    }),
    [
      errors,
      runtimeScriptEvents,
      runtimeTraceEvents,
      recordError,
      recordRuntimeScriptEvent,
      recordRuntimeTraceEvent,
      clearErrors,
      clearRuntimeScriptEvents,
      clearRuntimeTraceEvents,
      clearAllDiagnostics,
    ],
  );
  return <DiagnosticsContext.Provider value={value}>{children}</DiagnosticsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDiagnostics(): DiagnosticsContextValue {
  const ctx = useContext(DiagnosticsContext);
  if (!ctx) throw new Error('useDiagnostics must be used inside <DiagnosticsProvider>');
  return ctx;
}
