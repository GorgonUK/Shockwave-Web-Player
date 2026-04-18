import { Bug, Maximize2, Minimize2, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Tooltip } from '@/components/ui/Tooltip';
import type { PlayerStatus } from '@/types/player';

interface PlayerControlsProps {
  status: PlayerStatus;
  canLoad: boolean;
  onLoad: () => void;
  onReset: () => void;
  onToggleFullscreen: () => void;
  fullscreenSupported: boolean;
  isFullscreen: boolean;
  debugOpen: boolean;
  onToggleDebug: () => void;
}

export function PlayerControls({
  status,
  canLoad,
  onLoad,
  onReset,
  onToggleFullscreen,
  fullscreenSupported,
  isFullscreen,
  debugOpen,
  onToggleDebug,
}: PlayerControlsProps) {
  const isLoading = status.kind === 'loading';
  const isMounted = status.kind === 'mounted';
  const hadRun = isMounted || status.kind === 'playback-issue';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="primary"
        size="md"
        icon={<Play size={16} />}
        loading={isLoading}
        disabled={!canLoad || isLoading}
        onClick={onLoad}
      >
        {hadRun ? 'Reload' : 'Load'}
      </Button>
      <Button
        variant="secondary"
        size="md"
        icon={<RotateCcw size={15} />}
        onClick={onReset}
        disabled={status.kind === 'idle'}
      >
        Reset
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <Tooltip
          label={
            fullscreenSupported
              ? isFullscreen
                ? 'Exit fullscreen'
                : 'Fullscreen viewport'
              : 'Fullscreen unavailable on this device'
          }
        >
          <IconButton
            label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            icon={isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            onClick={onToggleFullscreen}
            disabled={!fullscreenSupported}
          />
        </Tooltip>
        <Tooltip label={debugOpen ? 'Hide diagnostics' : 'Show diagnostics'}>
          <IconButton
            label="Toggle diagnostics"
            icon={<Bug size={15} />}
            onClick={onToggleDebug}
            active={debugOpen}
          />
        </Tooltip>
      </div>
    </div>
  );
}
