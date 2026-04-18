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
            title="Audio needs a user gesture"
            body="Browsers unlock the Web Audio path after a gesture. Press Load first; if there is still no sound, click once on the game stage (e.g. PLAY) — that often resumes the audio context for Shockwave."
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
            body="If a game loads files like sound.cct next to the .dcr, add the matching .cct in the Cast slot. The app registers it under the same /__dirplayer-blob/… prefix as your movie so fetches succeed. Use the original filename the game expects (often sound.cct)."
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
        (highlight ? 'border-[var(--color-warning)]/35 bg-[var(--color-warning)]/[0.04]' : '')
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
