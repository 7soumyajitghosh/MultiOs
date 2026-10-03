import { useMemo, useState } from 'react';
import { ChevronRight, FileText, Folder, LayoutGrid, List, Search } from 'lucide-react';
import { FS_ROOT, findNode } from '../os/fs';
import { cn } from '../lib/cn';

const SIDEBAR = [
  { label: 'Recents', path: ['Users', 'maya', 'Documents'] },
  { label: 'Applications', path: ['Applications'] },
  { label: 'Desktop', path: ['Users', 'maya', 'Desktop'] },
  { label: 'Documents', path: ['Users', 'maya', 'Documents'] },
  { label: 'Downloads', path: ['Users', 'maya', 'Downloads'] },
  { label: 'Pictures', path: ['Users', 'maya', 'Pictures'] },
];

export function FinderApp({ dark }: { dark: boolean }) {
  const [path, setPath] = useState<string[]>(['Users', 'maya', 'Documents']);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');

  const node = findNode(path);
  const items = useMemo(() => {
    const kids = node?.children ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return kids;
    // shallow recursive search from root for demo
    const out: typeof kids = [];
    const walk = (n: typeof FS_ROOT) => {
      for (const c of n.children ?? []) {
        if (c.name.toLowerCase().includes(q)) out.push(c);
        if (c.children) walk(c);
      }
    };
    walk(FS_ROOT);
    return out.slice(0, 30);
  }, [node, query]);

  const open = (name: string) => {
    const target = (node?.children ?? []).find((c) => c.name === name);
    if (target?.type === 'folder') setPath([...path, name]);
  };

  return (
    <div className={cn('flex h-full min-h-0', dark ? 'bg-transparent' : '')}>
      {/* sidebar */}
      <aside className={cn('hidden w-48 shrink-0 flex-col gap-1 border-r p-2 sm:flex', dark ? 'border-white/10 bg-white/[0.04]' : 'border-black/[0.06] bg-black/[0.02]')}>
        <p className="px-2 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide opacity-40">Favorites</p>
        {SIDEBAR.map((s) => {
          const active = JSON.stringify(s.path) === JSON.stringify(path);
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => { setPath(s.path); setQuery(''); }}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[13px]',
                active ? 'bg-[#0071e3]/15 font-medium text-[#0071e3]' : dark ? 'text-white/70 hover:bg-white/10' : 'text-neutral-600 hover:bg-black/5',
              )}
            >
              <Folder className="size-4" /> {s.label}
            </button>
          );
        })}
        <div className={cn('mt-auto rounded-[10px] p-2.5 text-[11.5px]', dark ? 'bg-white/5 text-white/60' : 'bg-black/[0.04] text-neutral-500')}>
          <p className="font-semibold">iCloud Drive</p>
          <p>18.2 of 25 GB used</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/15"><div className="h-full w-[73%] rounded-full bg-[#0071e3]" /></div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* toolbar */}
        <div className={cn('flex items-center gap-2 border-b px-3 py-2', dark ? 'border-white/10' : 'border-black/[0.06]')}>
          <button type="button" disabled={path.length === 0} onClick={() => setPath(path.slice(0, -1))} className="rounded px-1.5 py-1 opacity-60 hover:opacity-100 disabled:opacity-25">‹</button>
          <div className={cn('flex min-w-0 flex-1 items-center gap-1 text-[12.5px]', dark ? 'text-white/60' : 'text-neutral-500')}>
            <button type="button" onClick={() => setPath([])} className="shrink-0 hover:underline">Macintosh HD</button>
            {path.map((seg, i) => (
              <span key={i} className="flex min-w-0 items-center gap-1">
                <ChevronRight className="size-3 shrink-0" />
                <button type="button" onClick={() => setPath(path.slice(0, i + 1))} className="truncate hover:underline">{seg}</button>
              </span>
            ))}
          </div>
          <label className={cn('hidden items-center gap-1.5 rounded-[8px] border px-2 py-1 sm:flex', dark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-white/70')}>
            <Search className="size-3.5 opacity-50" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-28 bg-transparent text-[12.5px] outline-none" />
          </label>
          <div className="flex overflow-hidden rounded-[8px] border border-black/10">
            <button type="button" aria-label="Grid view" onClick={() => setView('grid')} className={cn('cursor-pointer p-1.5', view === 'grid' ? 'bg-black/10' : 'bg-white/60')}><LayoutGrid className="size-3.5" /></button>
            <button type="button" aria-label="List view" onClick={() => setView('list')} className={cn('cursor-pointer p-1.5', view === 'list' ? 'bg-black/10' : 'bg-white/60')}><List className="size-3.5" /></button>
          </div>
        </div>
        {/* content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 opacity-50">
              <Folder className="size-12" strokeWidth={1.2} />
              <p className="text-[13px]">Folder is empty</p>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {items.map((it) => (
                <button
                  key={it.name}
                  type="button"
                  onDoubleClick={() => open(it.name)}
                  onClick={() => open(it.name)}
                  className={cn('group flex cursor-pointer flex-col items-center gap-1.5 rounded-[12px] p-3 text-center transition', dark ? 'hover:bg-white/10' : 'hover:bg-[#0071e3]/10')}
                >
                  {it.type === 'folder'
                    ? <Folder className="size-11 text-[#64b5ff]" strokeWidth={1.3} fill="currentColor" fillOpacity={0.25} />
                    : <FileText className={cn('size-10', dark ? 'text-white/70' : 'text-neutral-400')} strokeWidth={1.3} />}
                  <span className={cn('line-clamp-2 text-[12px] leading-tight break-words', dark ? 'text-white/85' : 'text-neutral-800')}>{it.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <table className={cn('w-full text-left text-[13px]', dark ? 'text-white/85' : 'text-neutral-800')}>
              <thead><tr className={cn('border-b text-[11px] uppercase tracking-wide', dark ? 'border-white/10 text-white/40' : 'border-black/10 text-neutral-400')}><th className="py-1.5 pr-2 font-semibold">Name</th><th className="hidden py-1.5 pr-2 font-semibold sm:table-cell">Modified</th><th className="py-1.5 font-semibold">Size</th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.name} onDoubleClick={() => open(it.name)} onClick={() => open(it.name)} className={cn('cursor-pointer border-b last:border-0', dark ? 'border-white/5 hover:bg-white/5' : 'border-black/5 hover:bg-black/[0.03]')}>
                    <td className="py-2 pr-2"><span className="flex items-center gap-2">{it.type === 'folder' ? <Folder className="size-4 shrink-0 text-[#64b5ff]" /> : <FileText className="size-4 shrink-0 opacity-50" />}<span className="truncate">{it.name}</span></span></td>
                    <td className="hidden py-2 pr-2 opacity-60 sm:table-cell">{it.modified ?? '—'}</td>
                    <td className="py-2 opacity-60">{it.size ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className={cn('border-t px-3 py-1.5 text-center text-[11.5px]', dark ? 'border-white/10 text-white/40' : 'border-black/[0.06] text-neutral-400')}>
          {items.length} items{query && ` matching “${query}”`} • Double-click folders to open
        </div>
      </div>
    </div>
  );
}
