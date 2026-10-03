import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  CalendarDays,
  Files,
  Home,
  KanbanSquare,
  Plus,
  Search,
  Settings,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/cn';

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: LucideIcon;
  action: 'navigate' | 'create' | 'palette';
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onCreate?: () => void;
}

const COMMANDS: PaletteCommand[] = [
  { id: 'overview', label: 'Go to Overview', group: 'Navigate', icon: Home, action: 'navigate' },
  { id: 'projects', label: 'Go to Projects', group: 'Navigate', icon: KanbanSquare, action: 'navigate' },
  { id: 'calendar', label: 'Go to Calendar', group: 'Navigate', icon: CalendarDays, action: 'navigate' },
  { id: 'documents', label: 'Go to Documents', group: 'Navigate', icon: Files, action: 'navigate' },
  { id: 'starred', label: 'Go to Starred', group: 'Navigate', icon: Star, action: 'navigate' },
  { id: 'team', label: 'Go to Team', group: 'Navigate', icon: Users, action: 'navigate' },
  { id: 'archive', label: 'Go to Archive', group: 'Navigate', icon: Archive, action: 'navigate' },
  { id: 'settings', label: 'Open Settings', hint: 'Workspace preferences', group: 'Navigate', icon: Settings, action: 'navigate' },
  { id: 'new-project', label: 'Create new project', hint: 'Start from a template', group: 'Actions', icon: Plus, action: 'create' },
];

/**
 * Floating command palette (Cmd/Ctrl + K).
 * Filterable, group-labelled, fully keyboard navigable.
 */
export function CommandPalette({ open, onClose, onNavigate, onCreate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        (c.hint ?? '').toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open ]);

  useEffect(() => setCursor(0), [query]);

  // Scroll active item into view when navigating with arrow keys
  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector('[aria-selected="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [cursor, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const run = (cmd: PaletteCommand) => {
    if (cmd.action === 'navigate') onNavigate(cmd.id);
    else if (cmd.action === 'create') onCreate?.();
    onClose();
  };

  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close command palette"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-neutral-900/30 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-[560px] overflow-hidden rounded-[16px] border border-white/60 bg-white/85 shadow-[var(--shadow-popover)] backdrop-blur-2xl animate-[scale-in_0.2s_cubic-bezier(0.22,1,0.36,1)_both]"
      >
        <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-4">
          <Search aria-hidden className="size-4 shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => (results.length ? (c + 1) % results.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) =>
                  results.length ? (c - 1 + results.length) % results.length : 0,
                );
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const cmd = results[cursor];
                if (cmd) run(cmd);
              }
            }}
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
            aria-activedescendant={results[cursor]?.id ?? undefined}
            placeholder="Type a command or search…"
            className="h-12 w-full bg-transparent text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          <kbd className="hidden shrink-0 rounded-[6px] border border-black/[0.08] bg-white px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-neutral-500 sm:block">
            esc
          </kbd>
        </div>

        <div ref={listRef} id="palette-list" role="listbox" aria-label="Commands" className="max-h-[320px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
              <p className="text-[14px] font-medium text-neutral-800">No results for “{query}”</p>
              <p className="text-[12.5px] text-neutral-500">Try searching for projects, team or settings.</p>
            </div>
          ) : (
            results.map((cmd, i) => {
              const showGroup = cmd.group !== lastGroup;
              lastGroup = cmd.group;
              const active = i === cursor;
              return (
                <div key={cmd.id}>
                  {showGroup && (
                    <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
                      {cmd.group}
                    </p>
                  )}
                  <button
                    id={cmd.id}
                    role="option"
                    aria-selected={active}
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => run(cmd)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors duration-150',
                      active ? 'bg-[#0071e3]/[0.09] text-neutral-900' : 'text-neutral-700',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-8 items-center justify-center rounded-[9px] border transition-colors duration-150',
                        active
                          ? 'border-[#0071e3]/20 bg-[#0071e3]/10 text-[#0071e3]'
                          : 'border-black/[0.06] bg-white text-neutral-500',
                      )}
                    >
                      <cmd.icon className="size-4" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="block truncate text-[12px] text-neutral-500">{cmd.hint}</span>
                      )}
                    </span>
                    {active && (
                      <kbd className="rounded-[5px] bg-black/[0.06] px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-neutral-500">
                        ↵
                      </kbd>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden items-center gap-4 border-t border-black/[0.06] bg-white/50 px-4 py-2 text-[11.5px] text-neutral-500 sm:flex">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-black/10 bg-white px-1 font-sans font-semibold">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-black/10 bg-white px-1 font-sans font-semibold">↵</kbd> select
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-black/10 bg-white px-1 font-sans font-semibold">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
