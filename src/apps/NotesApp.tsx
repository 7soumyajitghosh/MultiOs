import { useEffect, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { cn } from '../lib/cn';

interface Note {
  id: string;
  title: string;
  body: string;
  updated: string;
}

const KEY = 'aurora-notes-v1';

const SEED: Note[] = [
  { id: 'n1', title: 'Welcome to Aurora', body: 'This is your Notes app.\n\n• Double-click desktop icons to open apps\n• Drag windows by the title bar\n• Right-click the desktop for options\n• Press ⌘K for Spotlight\n\nEverything is saved locally.', updated: 'Today' },
  { id: 'n2', title: 'OS polish checklist', body: '— boot + login flow\n— draggable / resizable windows\n— dock magnification + launchpad\n— control center + calendar\n— finder + terminal + notes', updated: 'Yesterday' },
];

function load(): Note[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return SEED;
}

export function NotesApp({ dark }: { dark: boolean }) {
  const [notes, setNotes] = useState<Note[]>(load);
  const [activeId, setActiveId] = useState(notes[0]?.id ?? '');
  const [query, setQuery] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(notes));
    } catch { /* ignore */ }
  }, [notes]);

  const active = notes.find((n) => n.id === activeId) ?? notes[0];
  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.body.toLowerCase().includes(query.toLowerCase()),
  );

  const add = () => {
    const n: Note = { id: `n-${Date.now()}`, title: 'New Note', body: '', updated: 'Just now' };
    setNotes((p) => [n, ...p]);
    setActiveId(n.id);
  };
  const remove = (id: string) => {
    setNotes((p) => p.filter((n) => n.id !== id));
    if (activeId === id) setActiveId(notes.find((n) => n.id !== id)?.id ?? '');
  };
  const patch = (id: string, field: 'title' | 'body', v: string) =>
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, [field]: v, updated: 'Just now' } : n)));

  return (
    <div className="flex h-full min-h-0">
      <aside className={cn('flex w-56 shrink-0 flex-col border-r', dark ? 'border-white/10 bg-white/[0.04]' : 'border-black/[0.06] bg-black/[0.02]')}>
        <div className="flex items-center gap-2 p-2">
          <label className={cn('flex flex-1 items-center gap-1.5 rounded-[8px] border px-2 py-1.5', dark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-white')}>
            <Search className="size-3.5 opacity-50" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" className="w-full bg-transparent text-[12.5px] outline-none" />
          </label>
          <button type="button" onClick={add} aria-label="New note" className="cursor-pointer rounded-[8px] bg-[#0071e3] p-1.5 text-white hover:bg-[#0077ed]"><Plus className="size-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 pt-0">
          {filtered.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setActiveId(n.id)}
              className={cn(
                'mb-1 w-full cursor-pointer rounded-[10px] p-2.5 text-left transition',
                n.id === active?.id ? (dark ? 'bg-white/10' : 'bg-[#0071e3]/10 ring-1 ring-[#0071e3]/20') : dark ? 'hover:bg-white/5' : 'hover:bg-black/[0.04]',
              )}
            >
              <p className={cn('truncate text-[13px] font-semibold', dark ? 'text-white' : 'text-neutral-900')}>{n.title || 'Untitled'}</p>
              <p className={cn('mt-0.5 line-clamp-2 text-[12px]', dark ? 'text-white/50' : 'text-neutral-500')}>{n.body || 'No additional text'}</p>
              <p className={cn('mt-1 text-[11px]', dark ? 'text-white/35' : 'text-neutral-400')}>{n.updated}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className={cn('p-4 text-center text-[12.5px]', dark ? 'text-white/40' : 'text-neutral-400')}>No notes found.</p>}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <div className="flex items-center gap-2 border-b border-black/[0.06] px-3 py-2 dark:border-white/10">
              <input
                value={active.title}
                onChange={(e) => patch(active.id, 'title', e.target.value)}
                className={cn('w-full bg-transparent text-[15px] font-semibold outline-none', dark ? 'text-white' : 'text-neutral-900')}
              />
              <button type="button" onClick={() => remove(active.id)} aria-label="Delete note" className="cursor-pointer rounded p-1.5 opacity-50 hover:bg-red-500/10 hover:text-red-500 hover:opacity-100"><Trash2 className="size-4" /></button>
            </div>
            <textarea
              value={active.body}
              onChange={(e) => patch(active.id, 'body', e.target.value)}
              placeholder="Start typing…"
              className={cn('min-h-0 flex-1 resize-none bg-transparent p-4 text-[13.5px] leading-relaxed outline-none', dark ? 'text-white/85 placeholder:text-white/25' : 'text-neutral-800 placeholder:text-neutral-300')}
            />
            <p className={cn('border-t px-4 py-1.5 text-[11.5px]', dark ? 'border-white/10 text-white/35' : 'border-black/[0.06] text-neutral-400')}>{active.body.split(/\s+/).filter(Boolean).length} words • Saved locally</p>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center opacity-50">
            <button type="button" onClick={add} className="cursor-pointer rounded bg-[#0071e3] px-4 py-2 text-white">Create first note</button>
          </div>
        )}
      </div>
    </div>
  );
}
