import { useCallback, useRef, useState, type DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { Card, CardSection } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { cn } from '@/lib/utils/cn';
import { ACCEPT_ATTR, ACCEPTED_EXTENSIONS } from '@/lib/files/validation';
import { FileSlot } from './FileSlot';
import type { AssetSlots } from '@/types/assets';

interface UploadPanelProps {
  assets: AssetSlots;
  onDropFiles: (files: File[]) => void;
  onPickSlot: (kind: 'dcr' | 'cct', file: File) => void;
  onRemoveSlot: (kind: 'dcr' | 'cct') => void;
  onClearAll: () => void;
}

export function UploadPanel({
  assets,
  onDropFiles,
  onPickSlot,
  onRemoveSlot,
  onClearAll,
}: UploadPanelProps) {
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsOver(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length > 0) onDropFiles(files);
    },
    [onDropFiles],
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) setIsOver(false);
  }, []);

  const hasAny = Boolean(assets.movie || assets.cast);
  const isIos = /iPad|iPhone|iPod/.test(globalThis.navigator?.userAgent ?? '');
  const inputAcceptAttr = isIos ? undefined : ACCEPT_ATTR;

  return (
    <Card>
      <CardSection
        title="Upload"
        description={`Accepted: ${ACCEPTED_EXTENSIONS.join(', ')} · Max 250 MB. Files stay on your device.`}
        action={
          hasAny ? (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
          ) : null
        }
      >
        <div
          ref={dropZoneRef}
          role="button"
          tabIndex={0}
          aria-label="Drop .dcr and .cct files here, or press Enter to browse"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragEnter={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed px-4 py-7 text-center transition-all duration-200',
            isOver
              ? 'border-[var(--color-accent-500)]/60 bg-[var(--color-accent-500)]/[0.06] scale-[1.005]'
              : 'border-[var(--color-border-strong)] bg-white/[0.015] hover:bg-white/[0.025]',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={inputAcceptAttr}
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) onDropFiles(files);
              e.target.value = '';
            }}
          />
          <div
            className={cn(
              'grid h-12 w-12 place-items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] text-[var(--color-accent-300)]',
              isOver && 'text-[var(--color-accent-400)]',
            )}
          >
            <UploadCloud size={20} />
          </div>
          <div className="text-[13px] font-semibold text-[var(--color-fg)]">
            {isOver ? 'Drop files to upload' : 'Drop files here or click to browse'}
          </div>
          <div className="text-[11.5px] text-[var(--color-fg-subtle)]">
            Drag a <Kbd>.dcr</Kbd> and optionally a <Kbd>.cct</Kbd>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <FileSlot
            kind="dcr"
            asset={assets.movie}
            required
            onPick={(f) => onPickSlot('dcr', f)}
            onRemove={() => onRemoveSlot('dcr')}
          />
          <FileSlot
            kind="cct"
            asset={assets.cast}
            onPick={(f) => onPickSlot('cct', f)}
            onRemove={() => onRemoveSlot('cct')}
          />
        </div>
      </CardSection>
    </Card>
  );
}
