import { useState } from 'react';
import {
  Activity,
  AppWindow,
  Calculator,
  Compass,
  Folder,
  Info,
  Settings,
  SquareTerminal,
  StickyNote,
  LayoutGrid,
  Trash2,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import type { AppId } from '../../os/types';

interface Props {
  running: AppId[];
  activeApp: AppId | null;
  minimized: AppId[];
  dark: boolean;
  onOpen: (app: AppId) => void;
  onLaunchpad: () => void;
  onShowDesktop?: () => void;
}

const ITEMS: { id: AppId | 'launchpad' | 'trash'; label: string; Icon: typeof Folder; bg: string }[] = [
  { id: 'finder', label: 'Finder', Icon: Folder, bg: 'linear-gradient(180deg,#5ac8fa,#0071e3)' },
  { id: 'browser', label: 'Browser', Icon: Compass, bg: 'linear-gradient(180deg,#64d2ff,#0a84ff)' },
  { id: 'terminal', label: 'Terminal', Icon: SquareTerminal, bg: 'linear-gradient(180deg,#3a3a3c,#000)' },
  { id: 'notes', label: 'Notes', Icon: StickyNote, bg: 'linear-gradient(180deg,#ffd60a,#ff9f0a)' },
  { id: 'calculator', label: 'Calculator', Icon: Calculator, bg: 'linear-gradient(180deg,#8e8e93,#48484a)' },
  { id: 'projects', label: 'Workspace', Icon: AppWindow, bg: 'linear-gradient(180deg,#bf5af2,#5e5ce6)' },
  { id: 'activity', label: 'Activity Monitor', Icon: Activity, bg: 'linear-gradient(180deg,#5ac8fa,#0a84ff)' },
  { id: 'settings', label: 'Settings', Icon: Settings, bg: 'linear-gradient(180deg,#b0b3b8,#636366)' },
  { id: 'about', label: 'About', Icon: Info, bg: 'linear-gradient(180deg,#30d158,#0a84ff)' },
  { id: 'launchpad', label: 'Launchpad', Icon: LayoutGrid, bg: 'linear-gradient(180deg,#98989f,#48484a)' },
];

export function Dock({ running, activeApp, dark, onOpen, onLaunchpad }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const [bounce, setBounce] = useState<string | null>(null);

  const click = (id: (typeof ITEMS)[number]['id']) => {
    if (id === 'launchpad') {
      onLaunchpad();
      return;
    }
    if (id === 'trash') return;
    setBounce(id);
    window.setTimeout(() => setBounce(null), 600);
    onOpen(id as AppId);
  };

  return (
    <footer className="pointer-events-none absolute right-0 bottom-2 left-0 z-40 flex justify-center px-2" aria-label="Dock">
      <div
        className={cn(
          'pointer-events-auto flex max-w-full items-end gap-1.5 overflow-x-auto rounded-[24px] border px-2.5 py-2 backdrop-blur-2xl',
          dark ? 'border-white/15 bg-white/10 shadow-[0_16px_48px_rgb(0_0_0/0.5)]' : 'border-white/50 bg-white/55 shadow-[0_16px_48px_-8px_rgb(0_0_0/0.3)]',
        )}
        onMouseLeave={() => setHover(null)}
      >
        {ITEMS.map(({ id, label, Icon, bg }) => {
          const isRunning = running.includes(id as AppId);
          const isActive = activeApp === id;
          const isHover = hover === id;
          const scale = isHover ? 1.35 : 1;
          const lift = isHover ? -10 : 0;
          return (
            <div key={id} className="flex flex-col items-center">
              {isHover && (
                <span className={cn(
                  'mb-1.5 rounded-[8px] border px-2 py-0.5 text-[12px] font-medium whitespace-nowrap',
                  dark ? 'border-white/15 bg-black/70 text-white' : 'border-black/10 bg-white/90 text-neutral-800 shadow',
                )}>
                  {label}
                </span>
              )}
              <button
                type="button"
                title={label}
                aria-label={`Open ${label}`}
                onMouseEnter={() => setHover(id)}
                onClick={() => click(id)}
                className={cn(
                  'flex size-12 cursor-pointer items-center justify-center rounded-[14px] text-white shadow-md transition-all duration-150 ease-out hover:brightness-110 active:scale-90',
                  bounce === id && 'animate-[dock-bounce_0.6s_ease]',
                  isActive && 'ring-2 ring-white/70',
                )}
                style={{ background: bg, transform: `scale(${scale}) translateY(${lift}px)`, transformOrigin: 'bottom center' }}
              >
                <Icon className="size-6" strokeWidth={1.8} />
              </button>
              <span aria-hidden className={cn('mt-1 size-1 rounded-full bg-current', dark ? 'text-white/80' : 'text-neutral-800/70', isRunning ? 'opacity-100' : 'opacity-0')} />
            </div>
          );
        })}
        <div aria-hidden className={cn('mx-1 h-12 w-px self-center', dark ? 'bg-white/15' : 'bg-black/10')} />
        <div className="flex flex-col items-center">
          <button
            type="button"
            title="Trash"
            aria-label="Trash"
            className="flex size-12 cursor-pointer items-center justify-center rounded-[14px] bg-white/40 text-neutral-500 shadow-inner transition-all duration-150 hover:scale-110 hover:bg-white/70"
          >
            <Trash2 className="size-6" strokeWidth={1.6} />
          </button>
          <span aria-hidden className="mt-1 size-1 rounded-full opacity-0">•</span>
        </div>
      </div>
    </footer>
  );
}
