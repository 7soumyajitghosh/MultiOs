import {
  BatteryMedium,
  Bell,
  Search,
  Wifi,
} from 'lucide-react';
import { useClock } from '../hooks/useClock';
import { cn } from '../lib/cn';

interface MenuBarProps {
  appName: string;
  menus?: string[];
  onOpenPalette: () => void;
}

const DOT = 'size-[7px] rounded-full';

/**
 * Translucent top menu bar: app name + menus left,
 * status indicators + live clock right.
 */
export function MenuBar({ appName, menus, onOpenPalette }: MenuBarProps) {
  const { time, date } = useClock();
  const items = menus ?? ['File', 'Edit', 'View', 'Window', 'Help'];

  return (
    <header className="relative z-30 flex h-10 shrink-0 items-center gap-1 border-b border-white/40 bg-white/60 px-4 text-[13px] backdrop-blur-xl supports-[backdrop-filter]:bg-white/55">
      <div className="flex min-w-0 items-center gap-1">
        <span
          aria-hidden
          className="mr-1 flex size-4 items-center justify-center rounded-[5px] bg-neutral-900 text-white"
        >
          <svg viewBox="0 0 12 12" className="size-2.5" fill="currentColor" aria-hidden>
            <circle cx="4" cy="6" r="2.2" opacity=".9" />
            <circle cx="8.4" cy="6" r="2.2" opacity=".45" />
          </svg>
        </span>
        <strong className="mr-1 hidden text-[13px] font-semibold text-neutral-900 sm:block">
          {appName}
        </strong>
        <nav aria-label="Menu" className="hidden items-center md:flex">
          {items.map((m) => (
            <button
              key={m}
              type="button"
              className="cursor-pointer rounded-[6px] px-2.5 py-1 text-neutral-700 transition-colors duration-150 hover:bg-black/[0.06] hover:text-neutral-900 active:bg-black/[0.09]"
            >
              {m}
            </button>
          ))}
        </nav>
        <span className="ml-1 rounded-md bg-black/[0.05] px-2 py-0.5 text-[11.5px] font-medium text-neutral-500 md:hidden">
          {appName}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open command palette (Control or Command K)"
          className="mr-1 hidden items-center gap-1.5 rounded-[8px] border border-black/[0.06] bg-white/60 py-1 pr-2 pl-2.5 text-[12px] text-neutral-500 shadow-sm transition-all duration-200 hover:bg-white hover:text-neutral-800 lg:flex"
        >
          <Search aria-hidden className="size-3.5" />
          <span>Search</span>
          <kbd className="rounded-[5px] bg-black/[0.06] px-1.5 py-px font-sans text-[10.5px] font-semibold text-neutral-500">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-0.5 text-neutral-700" role="status" aria-label="System status">
          <span className="hidden items-center gap-1.5 rounded-[7px] px-2 py-1 text-[12px] tabular-nums sm:flex">
            <span className={cn(DOT, 'bg-green-500')} aria-hidden />
            <span className={cn(DOT, 'bg-green-500')} aria-hidden />
            <span className={cn(DOT, 'bg-neutral-300')} aria-hidden />
            <span className="sr-only">Sync status: up to date</span>
          </span>
          <button type="button" aria-label="Network status: connected" className="rounded-[7px] p-1.5 transition-colors duration-150 hover:bg-black/[0.06]">
            <Wifi aria-hidden className="size-4" strokeWidth={1.9} />
          </button>
          <button type="button" aria-label="Battery: 82 percent" className="hidden rounded-[7px] p-1.5 transition-colors duration-150 hover:bg-black/[0.06] sm:block">
            <BatteryMedium aria-hidden className="size-4" strokeWidth={1.9} />
          </button>
          <button type="button" aria-label="Notifications, 3 unread" className="relative rounded-[7px] p-1.5 transition-colors duration-150 hover:bg-black/[0.06]">
            <Bell aria-hidden className="size-4" strokeWidth={1.9} />
            <span aria-hidden className="absolute top-1 right-1 size-[7px] rounded-full border border-white bg-red-500" />
          </button>
        </div>

        <time
          dateTime={new Date().toISOString()}
          className="hidden text-[12.5px] font-medium text-neutral-700 tabular-nums min-[420px]:block"
        >
          <span className="mr-2 hidden text-neutral-400 xl:inline">{date}</span>
          {time}
        </time>
      </div>
    </header>
  );
}
