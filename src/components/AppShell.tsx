import type { ReactNode } from 'react';
import {
  CalendarDays,
  Files,
  Home,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import { MenuBar } from './MenuBar';
import { cn } from '../lib/cn';

interface AppShellProps {
  appName: string;
  maximized: boolean;
  onOpenPalette: () => void;
  children: ReactNode;
}

const DOCK_APPS = [
  { label: 'Overview', Icon: Home, active: true },
  { label: 'Documents', Icon: Files, active: false },
  { label: 'Calendar', Icon: CalendarDays, active: false },
  { label: 'Team', Icon: Users, active: false },
  { label: 'Settings', Icon: Settings, active: false },
];

/**
 * Full-screen desktop stage: gradient + blurred abstract shapes,
 * translucent menu bar, centered window slot, minimal dock.
 */
export function AppShell({ appName, maximized, onOpenPalette, children }: AppShellProps) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#e4e7ef]">
      {/* Backdrop: soft gradient + abstract blurred shapes (decorative) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#f2f4f9_0%,#e3e8f2_38%,#d8e2f0_62%,#e9e4ef_100%)]" />
        <div className="absolute -top-32 -left-24 size-[480px] rounded-full bg-[#a9c8f5]/50 blur-[110px]" />
        <div className="absolute top-1/3 -right-32 size-[520px] rounded-full bg-[#d3bdf2]/45 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 size-[460px] rounded-full bg-[#f6c9b8]/40 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(30_41_59/0.08)_100%)]" />
      </div>

      <MenuBar appName={appName} onOpenPalette={onOpenPalette} />

      {/* Window stage */}
      <main
        className={cn(
          'relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col',
          maximized ? 'max-w-none p-0' : 'max-w-[1160px] px-3 pt-4 pb-2 sm:px-5 sm:pt-6 lg:px-8',
        )}
      >
        <div className={cn('flex min-h-0 flex-1 flex-col', maximized ? 'h-full' : 'h-full max-h-[calc(100dvh-120px)]')}>
          {children}
        </div>

        {/* Hint bar */}
        {!maximized && (
          <p className="hidden pt-2 pb-1 text-center text-[11.5px] text-neutral-500/90 sm:block">
            Press{' '}
            <kbd className="rounded-[5px] border border-black/10 bg-white/70 px-1.5 py-px font-sans text-[10.5px] font-semibold text-neutral-600">
              ⌘K
            </kbd>{' '}
            or{' '}
            <kbd className="rounded-[5px] border border-black/10 bg-white/70 px-1.5 py-px font-sans text-[10.5px] font-semibold text-neutral-600">
              Ctrl K
            </kbd>{' '}
            to open the command palette
          </p>
        )}
      </main>

      {/* Dock */}
      {!maximized && (
        <footer className="relative z-10 hidden justify-center pt-1 pb-3 sm:flex" aria-label="Dock">
          <div className="flex items-center gap-1 rounded-[18px] border border-white/50 bg-white/55 px-2 py-1.5 shadow-[0_8px_28px_-8px_rgb(0_0_0/0.25)] backdrop-blur-xl">
            {DOCK_APPS.map(({ label, Icon, active }) => (
              <button
                key={label}
                type="button"
                title={label}
                aria-label={`Open ${label}`}
                className={cn(
                  'group flex size-10 cursor-pointer items-center justify-center rounded-[12px] transition-all duration-200 ease-out',
                  'hover:-translate-y-1 hover:bg-white/90 hover:shadow-md active:translate-y-0 active:scale-95',
                  active ? 'bg-white/85 shadow-sm' : 'text-neutral-600',
                )}
              >
                <Icon
                  aria-hidden
                  strokeWidth={1.8}
                  className={cn(
                    'size-5 transition-colors duration-200',
                    active ? 'text-[#0071e3]' : 'text-neutral-500 group-hover:text-neutral-800',
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    'absolute -bottom-[3px] size-1 rounded-full bg-neutral-800/70',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </button>
            ))}
            <div aria-hidden className="mx-1 h-8 w-px bg-black/10" />
            <button
              type="button"
              title="Trash"
              aria-label="Open Trash"
              className="flex size-10 cursor-pointer items-center justify-center rounded-[12px] text-neutral-500 transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-white/90 hover:text-neutral-800 hover:shadow-md active:translate-y-0 active:scale-95"
            >
              <Trash2 aria-hidden strokeWidth={1.8} className="size-5" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
