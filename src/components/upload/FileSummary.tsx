import { Card, CardSection } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatBytes } from '@/lib/files/formatBytes';
import type { AssetSlots } from '@/types/assets';

export function FileSummary({ assets }: { assets: AssetSlots }) {
  const total = (assets.movie?.size ?? 0) + (assets.cast?.size ?? 0);
  const count = (assets.movie ? 1 : 0) + (assets.cast ? 1 : 0);

  if (count === 0) return null;

  return (
    <Card>
      <CardSection title="Selection summary">
        <dl className="grid grid-cols-3 gap-3 text-[12px]">
          <Stat label="Files" value={String(count)} />
          <Stat label="Total size" value={formatBytes(total)} />
          <Stat
            label="Status"
            value={
              <Badge tone={assets.movie ? 'success' : 'warning'} dot>
                {assets.movie ? 'Ready' : 'Movie missing'}
              </Badge>
            }
          />
        </dl>
      </CardSection>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-white/[0.015] px-3 py-2">
      <dt className="text-[10.5px] uppercase tracking-wide text-[var(--color-fg-subtle)]">
        {label}
      </dt>
      <dd className="mt-1 text-[13px] font-medium text-[var(--color-fg)]">{value}</dd>
    </div>
  );
}
