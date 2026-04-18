import type { ReactNode } from 'react';
import { ToastsProvider } from '@/hooks/useToasts';
import { DiagnosticsProvider } from '@/hooks/useDiagnostics';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <DiagnosticsProvider>
      <ToastsProvider>{children}</ToastsProvider>
    </DiagnosticsProvider>
  );
}
