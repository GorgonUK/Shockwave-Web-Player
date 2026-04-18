export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] py-4">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-1 px-4 text-center text-[11.5px] text-[var(--color-fg-subtle)] sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <span>
          Local browser-based playback · No server runtime · Files never leave your device.
        </span>
        <span className="text-[var(--color-fg-subtle)]/80">
          Built with Vite, React &amp; Tailwind · Deployable on Vercel
        </span>
      </div>
    </footer>
  );
}
