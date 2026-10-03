import { Minus, Plus, X } from 'lucide-react';
import { cn } from '../lib/cn';

interface WindowControlsProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  maximized?: boolean;
}

const CONTROLS = [
  {
    key: 'close' as const,
    label: 'Close window',
    dot: 'bg-[#FF5F57] border-[#E0443E]',
    Icon: X,
  },
  {
    key: 'minimize' as const,
    label: 'Minimize window',
    dot: 'bg-[#FEBC2E] border-[#DEA123]',
    Icon: Minus,
  },
  {
    key: 'maximize' as const,
    label: 'Maximize window',
    dot: 'bg-[#28C840] border-[#1AAB29]',
    Icon: Plus,
  },
];

/**
 * Original traffic-light style window controls.
 * Circular buttons with glyphs revealed on group hover / focus,
 * mirroring general desktop conventions without copying system assets.
 */
export function WindowControls({
  onClose,
  onMinimize,
  onMaximize,
  maximized,
}: WindowControlsProps) {
  const handlers = {
    close: onClose,
    minimize: onMinimize,
    maximize: onMaximize,
  } as const;

  return (
    <div
      role="toolbar"
      aria-label="Window controls"
      className="group/controls flex items-center gap-2"
    >
      {CONTROLS.map(({ key, label, dot, Icon }) => (
        <button
          key={key}
          type="button"
          aria-label={key === 'maximize' && maximized ? 'Restore window' : label}
          onClick={handlers[key]}
          className={cn(
            'flex size-[13px] items-center justify-center rounded-full border shadow-[inset_0_1px_1px_rgb(255_255_255/0.35),0_1px_2px_rgb(0_0_0/0.12)]',
            'transition-transform duration-150 hover:scale-105 active:scale-95',
            dot,
          )}
        >
          <Icon
            aria-hidden
            strokeWidth={2.5}
            className={cn(
              'size-[8px] text-black/60 opacity-0 transition-opacity duration-150',
              'group-hover/controls:opacity-100 focus-visible:opacity-100',
              key === 'maximize' && maximized && 'rotate-45',
            )}
          />
        </button>
      ))}
    </div>
  );
}
