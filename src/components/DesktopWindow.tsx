import { useEffect, useState, type ReactNode } from 'react';
import { PanelLeft, RotateCcw, Search } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { WindowControls } from './WindowControls';
import { cn } from '../lib/cn';

interface DesktopWindowProps {
  title: string;
  activeId: string;
  onNavigate: (id: string) => void;
  onOpenPalette: () => void;
  children: ReactNode;
  maximized: boolean;
  onToggleMaximize: () => void;
}

/**
 * Centered application window: 20px radius, layered soft shadow,
 * glass header + sidebar/content split. Responsive down to mobile.
 */
export function DesktopWindow({
  title,
  activeId,
  onNavigate,
  onOpenPalette,
  children,
  maximized,
  onToggleMaximize,
}: DesktopWindowProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [visible, setVisible] = useState(true);

  // Close sidebar overlay on large screens (it becomes inline there)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setSidebarOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Close sidebar overlay on Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  if (!visible) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[20px] border border-white/50 bg-white/60 px-10 py-14 text-center shadow-[var(--shadow-window)] backdrop-blur-xl animate-[fade-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">
        <p className="text-[15px] font-semibold text-neutral-800">Window closed</p>
        <p className="max-w-[26ch] text-[13px] text-neutral-500">
          The demo window was closed with the red control. Nothing was lost.
        </p>
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] bg-[#0071e3] px-4 text-[13.5px] font-medium text-white shadow-md transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#0077ed] active:translate-y-0 active:scale-[0.98]"
        >
          <RotateCcw aria-hidden className="size-4" />
          Reopen window
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label={`${title} window`}
      className={cn(
        'flex min-h-0 w-full flex-col overflow-hidden border border-white/50 bg-[#f5f5f7]/85 shadow-[var(--shadow-window)] backdrop-blur-2xl',
        'animate-[fade-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]',
        maximized ? 'h-full rounded-none' : 'rounded-[20px]',
        'transition-[border-radius] duration-200',
      )}
      style={{ height: maximized ? '100%' : undefined }}
    >
      {/* Title bar */}
      <div className="relative flex h-[52px] shrink-0 items-center gap-3 border-b border-black/[0.06] bg-white/55 px-4">
        <WindowControls
          maximized={maximized}
          onClose={() => setVisible(false)}
          onMinimize={() => setVisible(false)}
          onMaximize={onToggleMaximize}
        />
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          aria-expanded={sidebarOpen}
          className="rounded-[8px] p-1.5 text-neutral-500 transition-colors duration-150 hover:bg-black/[0.06] hover:text-neutral-800 lg:hidden"
        >
          <PanelLeft aria-hidden className="size-[17px]" />
        </button>

        <h2 className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[13px] font-semibold text-neutral-700 sm:flex">
          {title}
        </h2>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPalette}
            className="hidden h-8 items-center gap-2 rounded-[9px] border border-black/[0.06] bg-white/70 pr-2.5 pl-3 text-[12.5px] text-neutral-400 shadow-sm transition-all duration-200 hover:border-black/[0.1] hover:text-neutral-600 sm:flex md:w-52"
            aria-label="Search or jump to anything"
          >
            <Search aria-hidden className="size-3.5" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="rounded-[5px] bg-black/[0.06] px-1.5 py-px font-sans text-[10.5px] font-semibold text-neutral-500">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Open command palette"
            className="rounded-[8px] p-2 text-neutral-500 transition-colors duration-150 hover:bg-black/[0.06] hover:text-neutral-800 sm:hidden"
          >
            <Search aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1">
        {/* Inline sidebar (desktop) */}
        <aside className="hidden w-60 shrink-0 border-r border-black/[0.06] bg-white/40 py-3 lg:block">
          <Sidebar activeId={activeId} onSelect={onNavigate} />
        </aside>

        {/* Overlay sidebar (tablet / mobile) */}
        {sidebarOpen && (
          <div className="absolute inset-0 z-20 lg:hidden">
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 cursor-default bg-neutral-900/20 backdrop-blur-[2px]"
            />
            <aside className="absolute top-0 bottom-0 left-0 w-64 border-r border-black/10 bg-[#f5f5f7]/95 py-3 shadow-2xl backdrop-blur-xl animate-[scale-in_0.2s_ease-out_both]">
              <Sidebar
                activeId={activeId}
                onSelect={(id) => {
                  onNavigate(id);
                  setSidebarOpen(false);
                }}
              />
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </section>
  );
}
