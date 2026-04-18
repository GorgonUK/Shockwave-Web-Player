import { Apple, FolderTree, Volume2 } from 'lucide-react';
import { Card, CardSection } from '@/components/ui/Card';
import type { BrowserEnv } from '@/lib/browser/env';

export function CompatibilityNotes({ env }: { env: BrowserEnv }) {
  return (
    <Card>
      <CardSection
        title="Compatibility notes"
        description="Things to keep in mind for browser-based playback."
      >
        <ul className="flex flex-col gap-2.5">
          <Note
            icon={<Volume2 size={14} />}
            title="Audio requires a tap"
            body="iPhone Safari (and Chrome) only allow audio to start after a user gesture. Press Load — that counts as the gesture."
          />
          <Note
            icon={<Apple size={14} />}
            title="iPhone Safari: no fullscreen"
            body="Mobile Safari blocks element fullscreen. The viewport scales to fit but cannot enter true fullscreen on iPhone."
            highlight={env.isIPhone}
          />
          <Note
            icon={<FolderTree size={14} />}
            title="External cast (.cct) path resolution"
            body="Director runtimes typically resolve external casts by relative filename. Local object URLs lose that filename — full external-cast support may need a static-hosting mode where assets live at predictable paths (e.g. /games/<slug>/sound.cct)."
          />
        </ul>
      </CardSection>
    </Card>
  );
}

function Note({
  icon,
  title,
  body,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <li
      className={
        'flex gap-3 rounded-[12px] border border-[var(--color-border)] bg-white/[0.012] p-3 ' +
        (highlight
          ? 'border-[var(--color-warning)]/35 bg-[var(--color-warning)]/[0.04]'
          : '')
      }
    >
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-accent-300)]">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-[var(--color-fg)]">{title}</div>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--color-fg-muted)]">{body}</p>
      </div>
    </li>
  );
}
