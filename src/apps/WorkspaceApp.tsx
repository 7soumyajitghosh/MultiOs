import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FolderOpen,
  Inbox,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import { ContentCard } from '../components/ContentCard';
import { NewProjectDialog, type NewProjectInput } from '../components/NewProjectDialog';
import { PrimaryButton } from '../components/PrimaryButton';
import { Sidebar } from '../components/Sidebar';
import { ACTIVITY, PROJECTS, type Project } from '../data/mock';
import { cn } from '../lib/cn';

const SECTION_META: Record<string, { title: string; subtitle: string }> = {
  overview: { title: 'Good morning, Maya', subtitle: 'Here is what is happening across your workspace today.' },
  projects: { title: 'Projects', subtitle: 'Track progress, ownership and review status in one place.' },
  calendar: { title: 'Calendar', subtitle: 'Your upcoming schedule and milestones.' },
  documents: { title: 'Documents', subtitle: 'Files shared across your workspace.' },
  starred: { title: 'Starred', subtitle: 'Items you pinned for quick access.' },
  team: { title: 'Team', subtitle: 'People and groups in this workspace.' },
  archive: { title: 'Archive', subtitle: 'Completed and archived work.' },
  settings: { title: 'Settings', subtitle: 'Workspace preferences and notifications.' },
};

const STATUS_STYLES: Record<Project['status'], string> = {
  Active: 'bg-green-500/12 text-green-700 ring-green-600/20',
  Review: 'bg-amber-500/12 text-amber-700 ring-amber-600/25',
  Paused: 'bg-neutral-500/10 text-neutral-600 ring-neutral-500/20',
  Shipped: 'bg-[#0071e3]/10 text-[#0071e3] ring-[#0071e3]/20',
};

function StatusBadge({ status }: { status: Project['status'] }) {
  const dot =
    status === 'Active' ? 'bg-green-500' : status === 'Review' ? 'bg-amber-500' : status === 'Shipped' ? 'bg-[#0071e3]' : 'bg-neutral-400';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset', STATUS_STYLES[status])}>
      <span aria-hidden className={cn('size-[6px] rounded-full', dot)} />
      {status}
    </span>
  );
}

export function WorkspaceApp({ dark }: { dark: boolean }) {
  const [activeId, setActiveId] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [query, setQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>(PROJECTS);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q) || p.owner.toLowerCase().includes(q) || p.status.toLowerCase().includes(q));
  }, [query, projects]);

  const meta = SECTION_META[activeId] ?? SECTION_META.overview;

  const handleCreate = (input: NewProjectInput) => {
    const initials = input.owner.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'NP';
    const project: Project = { id: `p-${crypto.randomUUID()}`, name: input.name, owner: input.owner, initials, status: input.status, progress: 0, updated: 'Just now' };
    setProjects((prev) => [project, ...prev]);
    setShowEmpty(false);
    setActiveId('projects');
    setAnnouncement(`${project.name} created.`);
  };

  const exportCsv = () => {
    const header = 'Name,Owner,Status,Progress,Updated\n';
    const rows = projects.map((p) => `"${p.name}","${p.owner}","${p.status}",${p.progress},"${p.updated}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.csv';
    a.click();
    URL.revokeObjectURL(url);
    setAnnouncement('Project list exported.');
  };

  return (
    <div className={cn('flex h-full min-h-0', dark && 'bg-white/[0.02]')}>
      <aside className={cn('hidden w-52 shrink-0 border-r py-2 sm:block', dark ? 'border-white/10' : 'border-black/[0.06]')}>
        <Sidebar activeId={activeId} onSelect={setActiveId} />
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="px-4 py-4 sm:px-5">
          {/* mobile nav */}
          <div className="mb-3 flex gap-1.5 overflow-x-auto sm:hidden">
            {['overview', 'projects', 'calendar', 'documents', 'team', 'settings'].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveId(id)}
                className={cn(
                  'shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-medium capitalize',
                  activeId === id ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : dark ? 'bg-white/10 text-white/70' : 'bg-black/[0.05] text-neutral-600',
                )}
              >
                {id}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={cn('text-[11.5px] font-semibold tracking-wide uppercase', dark ? 'text-white/40' : 'text-neutral-400')}>Workspace / {meta.title}</p>
              <h1 className={cn('mt-1 text-[22px] leading-tight font-semibold tracking-tight', dark ? 'text-white' : 'text-neutral-900')}>{meta.title}</h1>
              <p className={cn('mt-0.5 text-[13px]', dark ? 'text-white/50' : 'text-neutral-500')}>{meta.subtitle}</p>
            </div>
            {(activeId === 'overview' || activeId === 'projects') && (
              <div className="flex flex-wrap items-center gap-2">
                <PrimaryButton variant="secondary" icon={<Upload aria-hidden className="size-4" />} onClick={exportCsv}>Export</PrimaryButton>
                <PrimaryButton icon={<Plus aria-hidden className="size-4" />} onClick={() => setDialogOpen(true)}>New project</PrimaryButton>
              </div>
            )}
          </div>

          <div aria-live="polite" className="sr-only">{announcement}</div>

          {activeId === 'overview' && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                {[
                  { label: 'Active projects', value: '8', delta: '+2 this week', icon: Sparkles, tone: 'bg-[#0071e3]/10 text-[#0071e3]' },
                  { label: 'Awaiting review', value: '3', delta: '2 due today', icon: Clock3, tone: 'bg-amber-500/10 text-amber-600' },
                  { label: 'Tasks completed', value: '128', delta: '+12% vs last week', icon: CheckCircle2, tone: 'bg-green-500/10 text-green-600' },
                  { label: 'Team online', value: '5', delta: 'Across 2 time zones', icon: Bell, tone: 'bg-violet-500/10 text-violet-600' },
                ].map((s) => (
                  <ContentCard key={s.label} title={s.label} subtitle={s.delta} icon={s.icon} iconTone={s.tone} className={dark ? '!border-white/10 !bg-white/[0.05]' : ''}>
                    <p className={cn('text-[26px] leading-none font-semibold tracking-tight tabular-nums', dark ? 'text-white' : 'text-neutral-900')}>{s.value}</p>
                  </ContentCard>
                ))}
              </div>
              <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
                <ContentCard
                  title="Recent projects"
                  subtitle="Sorted by last activity"
                  className={dark ? '!border-white/10 !bg-white/[0.05]' : ''}
                  action={<button type="button" onClick={() => setActiveId('projects')} className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] px-2 py-1 text-[12.5px] font-medium text-[#0071e3] hover:bg-[#0071e3]/10">View all <ArrowRight aria-hidden className="size-3.5" /></button>}
                >
                  <ul className="-mx-1 flex flex-col">
                    {projects.slice(0, 4).map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => setActiveId('projects')} className={cn('flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2 py-2 text-left transition', dark ? 'hover:bg-white/10' : 'hover:bg-black/[0.04]')}>
                          <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-bold', dark ? 'bg-white/10 text-white/70' : 'bg-neutral-900/[0.05] text-neutral-600')}>{p.initials}</span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('block truncate text-[13.5px] font-medium', dark ? 'text-white' : 'text-neutral-900')}>{p.name}</span>
                            <span className={cn('block truncate text-[12px]', dark ? 'text-white/50' : 'text-neutral-500')}>{p.owner} · {p.updated}</span>
                          </span>
                          <StatusBadge status={p.status} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </ContentCard>
                <ContentCard title="Activity" subtitle="Latest updates from your team" className={dark ? '!border-white/10 !bg-white/[0.05]' : ''}>
                  <ul className="flex flex-col gap-1">
                    {ACTIVITY.map((a) => (
                      <li key={a.id} className={cn('flex items-start gap-2.5 rounded-[10px] px-2 py-2', dark ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]')}>
                        <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-300" />
                        <div className="min-w-0 text-[13px] leading-snug">
                          <span className={cn('font-medium', dark ? 'text-white/90' : 'text-neutral-800')}>{a.actor}</span>{' '}
                          <span className={dark ? 'text-white/55' : 'text-neutral-500'}>{a.action}</span>
                          <span className={cn('block text-[11.5px]', dark ? 'text-white/35' : 'text-neutral-400')}>{a.time}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ContentCard>
              </div>
              <ContentCard title="Quick actions" subtitle="Common tasks, one click away" className={dark ? '!border-white/10 !bg-white/[0.05]' : ''}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[{ label: 'Invite member', icon: Plus }, { label: 'Import files', icon: Download }, { label: 'View schedule', icon: CalendarDays }].map(({ label, icon: Icon }) => (
                    <button key={label} type="button" onClick={() => setAnnouncement(`${label} started.`)} className={cn('flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border px-3 py-2.5 text-[12.5px] font-medium transition hover:-translate-y-[1px] hover:shadow-md active:translate-y-0', dark ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10' : 'border-black/[0.07] bg-white/70 text-neutral-700 hover:text-neutral-900')}>
                      <Icon aria-hidden className="size-4 opacity-50" />{label}
                    </button>
                  ))}
                </div>
              </ContentCard>
            </div>
          )}

          {activeId === 'projects' && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative flex-1">
                  <span className="sr-only">Filter projects</span>
                  <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-40" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by name, owner or status…" className={cn('h-9 w-full rounded-[10px] border pr-3 pl-9 text-[13.5px] shadow-sm outline-none', dark ? 'border-white/10 bg-white/5 text-white placeholder:text-white/30' : 'border-black/[0.08] bg-white/80 text-neutral-900 placeholder:text-neutral-400')} />
                </label>
                <div className="flex items-center gap-2">
                  <PrimaryButton size="sm" variant="secondary" loading={loading} onClick={() => { setLoading(true); window.setTimeout(() => setLoading(false), 1200); }}>
                    {loading ? 'Refreshing…' : 'Refresh'}
                  </PrimaryButton>
                  <PrimaryButton size="sm" variant="secondary" aria-pressed={showEmpty} onClick={() => setShowEmpty((v) => !v)}>
                    {showEmpty ? 'Show data' : 'Show empty'}
                  </PrimaryButton>
                </div>
              </div>
              <ContentCard title={loading ? 'Loading projects…' : `${filtered.length} projects`} subtitle="Click a row to open project details." className={dark ? '!border-white/10 !bg-white/[0.05]' : ''}>
                {loading ? (
                  <div className="flex flex-col gap-2.5 py-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3"><div className="skeleton-shimmer size-9 rounded-[10px]" /><div className="flex-1"><div className="skeleton-shimmer h-3 w-2/5 rounded-full" /><div className="skeleton-shimmer mt-1.5 h-2.5 w-1/4 rounded-full" /></div></div>
                    ))}
                  </div>
                ) : showEmpty || filtered.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-8 text-center">
                    <span className={cn('flex size-12 items-center justify-center rounded-[14px] border', dark ? 'border-white/10 bg-white/5 text-white/40' : 'border-black/[0.06] bg-neutral-100 text-neutral-400')}>
                      {filtered.length === 0 && !showEmpty ? <Search className="size-6" /> : <FolderOpen className="size-6" />}
                    </span>
                    <p className={cn('mt-3 text-[14px] font-semibold', dark ? 'text-white' : 'text-neutral-900')}>{filtered.length === 0 && !showEmpty ? `No matches for “${query}”` : 'No projects here yet'}</p>
                    <div className="mt-3"><PrimaryButton size="sm" icon={<Plus className="size-4" />} onClick={() => setDialogOpen(true)}>Create project</PrimaryButton></div>
                  </div>
                ) : (
                  <div className="-mx-2 overflow-x-auto px-2">
                    <table className="w-full min-w-[520px] border-collapse text-left">
                      <thead><tr className={cn('border-b text-[11px] font-semibold tracking-wide uppercase', dark ? 'border-white/10 text-white/40' : 'border-black/[0.06] text-neutral-400')}><th className="py-2 pr-3">Project</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Progress</th><th className="py-2"><span className="sr-only">Open</span></th></tr></thead>
                      <tbody>
                        {filtered.map((p) => (
                          <tr key={p.id} className={cn('group border-b last:border-0', dark ? 'border-white/5 hover:bg-white/5' : 'border-black/[0.04] hover:bg-black/[0.025]')}>
                            <td className="py-2.5 pr-3"><div className="flex items-center gap-2.5"><span className={cn('flex size-8 items-center justify-center rounded-[9px] text-[10.5px] font-bold', dark ? 'bg-white/10 text-white/70' : 'bg-neutral-900/[0.05] text-neutral-600')}>{p.initials}</span><div className="min-w-0"><p className={cn('truncate text-[13.5px] font-medium', dark ? 'text-white' : 'text-neutral-900')}>{p.name}</p><p className={cn('truncate text-[12px]', dark ? 'text-white/50' : 'text-neutral-500')}>{p.owner} · {p.updated}</p></div></div></td>
                            <td className="py-2.5 pr-3"><StatusBadge status={p.status} /></td>
                            <td className="py-2.5 pr-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-black/10"><div className={cn('h-full rounded-full', p.progress === 100 ? 'bg-green-500' : 'bg-[#0071e3]')} style={{ width: `${p.progress}%` }} /></div><span className={cn('text-[12px] tabular-nums', dark ? 'text-white/50' : 'text-neutral-500')}>{p.progress}%</span></div></td>
                            <td className="py-2.5 text-right"><button type="button" aria-label={`Open ${p.name}`} onClick={() => setAnnouncement(`${p.name} opened.`)} className="cursor-pointer rounded-[8px] p-1.5 opacity-40 hover:bg-black/10 hover:opacity-100"><ArrowUpRight className="size-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ContentCard>
              <p className={cn('flex items-center gap-1.5 text-[12px]', dark ? 'text-white/35' : 'text-neutral-400')}>
                {loading && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
                {loading ? 'Syncing with workspace…' : 'Demonstrates loading, empty, hover, focus, selected and disabled states.'}
              </p>
            </div>
          )}

          {!['overview', 'projects'].includes(activeId) && (
            <div className="mt-4">
              <ContentCard className={dark ? '!border-white/10 !bg-white/[0.05]' : ''}>
                <div className="flex flex-col items-center px-6 py-8 text-center">
                  <span className={cn('flex size-12 items-center justify-center rounded-[14px] border', dark ? 'border-white/10 bg-white/5 text-white/40' : 'border-black/[0.06] bg-neutral-100 text-neutral-400')}><Inbox className="size-6" strokeWidth={1.6} /></span>
                  <p className={cn('mt-3 text-[14px] font-semibold', dark ? 'text-white' : 'text-neutral-900')}>{meta.title} is empty</p>
                  <p className={cn('mt-1 max-w-[32ch] text-[13px]', dark ? 'text-white/50' : 'text-neutral-500')}>Nothing has been added here yet.</p>
                  <div className="mt-3"><PrimaryButton size="sm" icon={<Plus className="size-4" />} onClick={() => setDialogOpen(true)}>Create new item</PrimaryButton></div>
                </div>
              </ContentCard>
            </div>
          )}
        </div>
      </div>
      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreate={handleCreate} />
    </div>
  );
}
