import { AppWindow, Calculator, Compass, Folder, Info, Settings, SquareTerminal, StickyNote } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { AppId } from '../../os/types';

const APPS: { id: AppId; label: string; Icon: typeof Folder; bg: string }[] = [
  { id: 'finder', label: 'Finder', Icon: Folder, bg: 'linear-gradient(180deg,#5ac8fa,#0071e3)' },
  { id: 'browser', label: 'Browser', Icon: Compass, bg: 'linear-gradient(180deg,#64d2ff,#0a84ff)' },
  { id: 'terminal', label: 'Terminal', Icon: SquareTerminal, bg: 'linear-gradient(180deg,#3a3a3c,#000)' },
  { id: 'notes', label: 'Notes', Icon: StickyNote, bg: 'linear-gradient(180deg,#ffd60a,#ff9f0a)' },
  { id: 'calculator', label: 'Calculator', Icon: Calculator, bg: 'linear-gradient(180deg,#8e8e93,#48484a)' },
  { id: 'projects', label: 'Workspace', Icon: AppWindow, bg: 'linear-gradient(180deg,#bf5af2,#5e5ce6)' },
  { id: 'settings', label: 'Settings', Icon: Settings, bg: 'linear-gradient(180deg,#b0b3b8,#636366)' },
  { id: 'about', label: 'About', Icon: Info, bg: 'linear-gradient(180deg,#30d158,#0a84ff)' },
];

export function Launchpad({ dark, onOpen, onClose }: { dark: boolean; onOpen: (a: AppId) => void; onClose: () => void }) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-[32px] animate-[fade-up_0.25s_ease-out_both]',
        dark ? 'bg-black/60' : 'bg-white/40',
      )}
      onClick={onClose}
    >
      <div className="mb-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className={cn('flex h-10 items-center gap-2 rounded-[12px] border px-3', dark ? 'border-white/15 bg-white/10 text-white' : 'border-black/10 bg-white/80 text-neutral-700')}>
          <span aria-hidden>⌕</span>
          <input
            autoFocus
            placeholder="Search apps"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter') {
                const q = (e.target as HTMLInputElement).value.toLowerCase();
                const hit = APPS.find((a) => a.label.toLowerCase().includes(q));
                if (hit) {
                  onOpen(hit.id);
                  onClose();
                }
              }
            }}
            className="w-full bg-transparent text-[14px] outline-none placeholder:opacity-50"
          />
        </div>
      </div>
      <div className="grid max-w-2xl grid-cols-3 gap-x-10 gap-y-8 sm:grid-cols-4" onClick={(e) => e.stopPropagation()}>
        {APPS.map(({ id, label, Icon, bg }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              onOpen(id);
              onClose();
            }}
            className="group flex cursor-pointer flex-col items-center gap-2"
          >
            <span
              className="flex size-20 items-center justify-center rounded-[22px] text-white shadow-xl transition-transform duration-150 group-hover:scale-110 group-active:scale-95"
              style={{ background: bg }}
            >
              <Icon className="size-10" strokeWidth={1.4} />
            </span>
            <span className={cn('text-[13px] font-medium', dark ? 'text-white' : 'text-neutral-800')}>{label}</span>
          </button>
        ))}
      </div>
      <p className={cn('mt-10 text-[12px]', dark ? 'text-white/50' : 'text-neutral-500')}>Click anywhere to close • Esc</p>
    </div>
  );
}
