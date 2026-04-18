import { Github } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <LogoMark />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[14.5px] font-semibold tracking-tight text-[var(--color-fg)]">
                Shockwave Web Player
              </h1>
              <Badge tone="accent" className="hidden sm:inline-flex">
                Experimental
              </Badge>
            </div>
            <p className="truncate text-[11.5px] text-[var(--color-fg-subtle)]">
              Browser-based Adobe Director runtime · powered by DirPlayer
            </p>
          </div>
        </div>
        <a
          href="https://vercel.com"
          target="_blank"
          rel="noreferrer noopener"
          className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] text-[var(--color-fg-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--color-fg)] sm:inline-flex"
          aria-label="Project repository"
        >
          <Github size={14} />
          Repository
        </a>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[var(--color-border-strong)] bg-gradient-to-br from-[var(--color-accent-500)]/30 to-[var(--color-cyan-500)]/20">
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        className="text-white drop-shadow-[0_0_6px_rgba(124,92,255,0.6)]"
      >
        <path d="M8 6.2 18 12 8 17.8z" fill="currentColor" />
      </svg>
    </div>
  );
}
