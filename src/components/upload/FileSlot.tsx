import { useRef } from 'react';
import { File as FileIcon, FileMusic, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/utils/cn';
import { formatBytes } from '@/lib/files/formatBytes';
import type { AssetKind, UploadedAsset } from '@/types/assets';

interface FileSlotProps {
  kind: AssetKind;
  asset: UploadedAsset | null;
  required?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}

const META: Record<AssetKind, { label: string; hint: string; tone: 'accent' | 'info' }> = {
  dcr: {
    label: 'Movie · .dcr',
    hint: 'The main Director movie',
    tone: 'accent',
  },
  cct: {
    label: 'External cast · .cct',
    hint: 'Optional supporting cast (e.g. sound.cct)',
    tone: 'info',
  },
};

export function FileSlot({ kind, asset, required, onPick, onRemove }: FileSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = META[kind];

  const Icon = kind === 'dcr' ? FileIcon : FileMusic;

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 rounded-[14px] border border-[var(--color-border)] bg-white/[0.015] p-3 transition-colors',
        asset && 'border-[var(--color-border-strong)] bg-white/[0.03]',
      )}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-fg-muted)]">
        <Icon size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-semibold text-[var(--color-fg)]">{meta.label}</span>
          {required ? (
            <Badge tone="warning" className="px-1.5 py-0.5 text-[10px]">
              Required
            </Badge>
          ) : (
            <Badge className="px-1.5 py-0.5 text-[10px]">Optional</Badge>
          )}
        </div>
        {asset ? (
          <div className="mt-0.5 truncate font-mono text-[11.5px] text-[var(--color-fg-muted)]">
            {asset.name} · {formatBytes(asset.size)}
          </div>
        ) : (
          <div className="mt-0.5 truncate text-[11.5px] text-[var(--color-fg-subtle)]">
            {meta.hint}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept={kind === 'dcr' ? '.dcr' : '.cct'}
          className="sr-only"
          aria-label={`Choose ${kind.toUpperCase()} file`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = '';
          }}
        />
        <IconButton
          label={asset ? `Replace ${kind.toUpperCase()}` : `Browse for ${kind.toUpperCase()}`}
          icon={asset ? <RefreshCw size={14} /> : <Upload size={14} />}
          size="sm"
          onClick={() => inputRef.current?.click()}
        />
        {asset ? (
          <IconButton
            label={`Remove ${kind.toUpperCase()}`}
            icon={<Trash2 size={14} />}
            size="sm"
            tone="danger"
            onClick={onRemove}
          />
        ) : null}
      </div>
    </div>
  );
}
