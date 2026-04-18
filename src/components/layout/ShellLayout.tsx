import type { ReactNode } from 'react';

interface ShellLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
}

export function ShellLayout({ sidebar, main }: ShellLayoutProps) {
  return (
    <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-6">
      <aside className="flex flex-col gap-5 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-92px)] lg:overflow-y-auto lg:pr-1">
        {sidebar}
      </aside>
      <main className="flex min-w-0 flex-col gap-5">{main}</main>
    </div>
  );
}
