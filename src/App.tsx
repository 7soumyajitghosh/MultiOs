import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { AppShell } from './components/AppShell';
import { CommandPalette } from './components/CommandPalette';
import { ContentCard } from './components/ContentCard';
import { DesktopWindow } from './components/DesktopWindow';
import { NewProjectDialog, type NewProjectInput } from './components/NewProjectDialog';
import { PrimaryButton } from './components/PrimaryButton';
import { ACTIVITY, PROJECTS, type Project } from './data/mock';
import { cn } from './lib/cn';

const SECTION_META: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: 'Good morning, Maya',
    subtitle: 'Here is what is happening across your workspace today.',
  },
  projects: {
    title: 'Projects',
    subtitle: 'Track progress, ownership and review status in one place.',
  },
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
    status === 'Active'
      ? 'bg-green-500'
      : status === 'Review'
        ? 'bg-amber-500'
        : status === 'Shipped'
          ? 'bg-[#0071e3]'
          : 'bg-neutral-400';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset',
        STATUS_STYLES[status],
      )}
    >
      <span aria-hidden className={cn('size-[6px] rounded-full', dot)} />
      {status}
    </span>
  );
}

function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-2.5 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton-shimmer size-9 shrink-0 rounded-[10px]" />
          <div className="flex-1">
            <div className="skeleton-shimmer h-3 w-2/5 rounded-full" />
            <div className="skeleton-shimmer mt-1.5 h-2.5 w-1/4 rounded-full" />
          </div>
          <div className="skeleton-shimmer hidden h-6 w-16 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: typeof Inbox;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-[14px] border border-black/[0.06] bg-neutral-100 text-neutral-400">
        <Icon aria-hidden className="size-6" strokeWidth={1.6} />
      </span>
      <p className="mt-4 text-[14px] font-semibold text-neutral-900">{title}</p>
      <p className="mt-1 max-w-[32ch] text-[13px] leading-relaxed text-neutral-500">{body}</p>
      {actionLabel && (
        <div className="mt-4">
          <PrimaryButton size="sm" icon={<Plus aria-hidden className="size-4" />} onClick={onAction}>
            {actionLabel}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeId, setActiveId] = useState('overview');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [query, setQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>(PROJECTS);

  // Clear screen reader announcements after they've been read
  useEffect(() => {
    if (!announcement) return;
    const id = window.setTimeout(() => setAnnouncement(''), 3000);
    return () => window.clearTimeout(id);
  }, [announcement]);

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q),
    );
  }, [query]);

  const meta = SECTION_META[activeId] ?? SECTION_META.overview;

  const createProject = () => setProjectDialogOpen(true);
  const handleCreateProject = (input: NewProjectInput) => {
    const initials = input.owner
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'NP';
    const project: Project = {
      id: `p-${crypto.randomUUID()}`,
      name: input.name,
      owner: input.owner,
      initials,
      status: input.status,
      progress: 0,
      updated: 'Just now',
    };
    setProjects((prev) => [project, ...prev]);
    setShowEmpty(false);
    setActiveId('projects');
    setAnnouncement(`${project.name} created.`);
  };
  const exportCsv = () => {
    const header = 'Name,Owner,Status,Progress,Updated\n';
    const rows = projects
      .map((p) => `"${p.name}","${p.owner}","${p.status}",${p.progress},"${p.updated}"`)
      .join('\n');
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
    <AppShell appName="Aurora" maximized={maximized} onOpenPalette={openPalette}>
      <DesktopWindow
        title="Aurora — Workspace"
        activeId={activeId}
        onNavigate={setActiveId}
        onOpenPalette={openPalette}
        maximized={maximized}
        onToggleMaximize={() => setMaximized((v) => !v)}
      >
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {/* Page heading */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold tracking-wide text-neutral-400 uppercase">
                Workspace / {meta.title}
              </p>
              <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-tight text-neutral-900 sm:text-[30px]">
                {meta.title}
              </h1>
              <p className="mt-1 max-w-[60ch] text-[13.5px] text-neutral-500">{meta.subtitle}</p>
            </div>
            {(activeId === 'overview' || activeId === 'projects') && (
              <div className="flex flex-wrap items-center gap-2">
                <PrimaryButton
                  variant="secondary"
                  icon={<Upload aria-hidden className="size-4" />}
                  onClick={exportCsv}
                >
                  Export
                </PrimaryButton>
                <PrimaryButton icon={<Plus aria-hidden className="size-4" />} onClick={createProject}>
                  New project
                </PrimaryButton>
              </div>
            )}
          </div>

          <div aria-live="polite" className="sr-only">
            {announcement}
          </div>

          {activeId === 'overview' && (
            <div className="mt-5 flex flex-col gap-4">
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                  { label: 'Active projects', value: '8', delta: '+2 this week', icon: Sparkles, tone: 'bg-[#0071e3]/10 text-[#0071e3]' },
                  { label: 'Awaiting review', value: '3', delta: '2 due today', icon: Clock3, tone: 'bg-amber-500/10 text-amber-600' },
                  { label: 'Tasks completed', value: '128', delta: '+12% vs last week', icon: CheckCircle2, tone: 'bg-green-500/10 text-green-600' },
                  { label: 'Team online', value: '5', delta: 'Across 2 time zones', icon: Bell, tone: 'bg-violet-500/10 text-violet-600' },
                ].map((s) => (
                  <ContentCard key={s.label} title={s.label} subtitle={s.delta} icon={s.icon} iconTone={s.tone}>
                    <p className="text-[28px] leading-none font-semibold tracking-tight text-neutral-900 tabular-nums">
                      {s.value}
                    </p>
                  </ContentCard>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
                {/* Projects table */}
                <ContentCard
                  title="Recent projects"
                  subtitle="Sorted by last activity"
                  className="overflow-hidden"
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveId('projects')}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] px-2 py-1 text-[12.5px] font-medium text-[#0071e3] transition-colors duration-150 hover:bg-[#0071e3]/10"
                    >
                      View all <ArrowRight aria-hidden className="size-3.5" />
                    </button>
                  }
                >
                  <ul className="-mx-1 flex flex-col">
                    {projects.slice(0, 4).map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setActiveId('projects')}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors duration-150 hover:bg-black/[0.04] active:bg-black/[0.06]"
                        >
                          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-neutral-900/[0.05] text-[11px] font-bold text-neutral-600">
                            {p.initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium text-neutral-900">
                              {p.name}
                            </span>
                            <span className="block truncate text-[12px] text-neutral-500">
                              {p.owner} · {p.updated}
                            </span>
                          </span>
                          <StatusBadge status={p.status} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </ContentCard>

                {/* Activity */}
                <ContentCard title="Activity" subtitle="Latest updates from your team">
                  <ul className="flex flex-col gap-1">
                    {ACTIVITY.map((a) => (
                      <li
                        key={a.id}
                        className="flex cursor-default items-start gap-2.5 rounded-[10px] px-2 py-2 transition-colors duration-150 hover:bg-black/[0.03]"
                      >
                        <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-300" />
                        <div className="min-w-0 text-[13px] leading-snug">
                          <span className="font-medium text-neutral-800">{a.actor}</span>{' '}
                          <span className="text-neutral-500">{a.action}</span>
                          <span className="block text-[11.5px] text-neutral-400">{a.time}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ContentCard>
              </div>

              {/* Quick actions + storage row */}
              <div className="grid gap-4 md:grid-cols-2">
                <ContentCard title="Quick actions" subtitle="Common tasks, one click away">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { label: 'Invite member', icon: Plus },
                      { label: 'Import files', icon: Download },
                      { label: 'View schedule', icon: CalendarDays },
                    ].map(({ label, icon: Icon }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setAnnouncement(`${label} started.`)}
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-black/[0.07] bg-white/70 px-3 py-2.5 text-[12.5px] font-medium text-neutral-700 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md hover:text-neutral-900 active:translate-y-0 active:scale-[0.98]"
                      >
                        <Icon aria-hidden className="size-4 text-neutral-400" />
                        {label}
                      </button>
                    ))}
                  </div>
                </ContentCard>
                <ContentCard
                  title="Tip"
                  subtitle="Press ⌘K anywhere to jump between sections"
                  icon={Sparkles}
                  iconTone="bg-violet-500/10 text-violet-600"
                >
                  <div className="flex flex-wrap gap-2">
                    <PrimaryButton size="sm" onClick={openPalette}>
                      Open command palette
                    </PrimaryButton>
                    <PrimaryButton size="sm" variant="secondary" onClick={() => setActiveId('settings')}>
                      Workspace settings <ArrowUpRight aria-hidden className="size-3.5" />
                    </PrimaryButton>
                  </div>
                </ContentCard>
              </div>
            </div>
          )}

          {activeId === 'projects' && (
            <div className="mt-5 flex flex-col gap-4">
              {/* Toolbar */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative flex-1">
                  <span className="sr-only">Filter projects</span>
                  <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by name, owner or status…"
                    className="h-9 w-full rounded-[10px] border border-black/[0.08] bg-white/80 pr-3 pl-9 text-[13.5px] text-neutral-900 shadow-sm backdrop-blur transition-all duration-200 outline-none placeholder:text-neutral-400 hover:border-black/[0.12] focus:border-[#0071e3]/60 focus:ring-[3px] focus:ring-[#0071e3]/20"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <PrimaryButton
                    size="sm"
                    variant="secondary"
                    loading={loading}
                    onClick={() => {
                      setLoading(true);
                      window.setTimeout(() => setLoading(false), 1400);
                    }}
                  >
                    {loading ? 'Refreshing…' : 'Refresh'}
                  </PrimaryButton>
                  <PrimaryButton
                    size="sm"
                    variant="secondary"
                    aria-pressed={showEmpty}
                    onClick={() => setShowEmpty((v) => !v)}
                  >
                    {showEmpty ? 'Show data' : 'Show empty'}
                  </PrimaryButton>
                  <PrimaryButton size="sm" variant="secondary" disabled title="Archiving is unavailable in this demo">
                    Archive
                  </PrimaryButton>
                </div>
              </div>

              <ContentCard
                title={loading ? 'Loading projects…' : showEmpty ? 'Projects' : `${filtered.length} projects`}
                subtitle={loading ? 'Fetching the latest workspace data.' : 'Click a row to open project details.'}
              >
                {loading ? (
                  <TableSkeleton rows={5} />
                ) : showEmpty || filtered.length === 0 ? (
                  <EmptyState
                    icon={filtered.length === 0 && !showEmpty ? Search : FolderOpen}
                    title={filtered.length === 0 && !showEmpty ? `No matches for “${query}”` : 'No projects here yet'}
                    body={
                      filtered.length === 0 && !showEmpty
                        ? 'Try a different name, owner or status filter.'
                        : 'Create your first project to start tracking progress and reviews.'
                    }
                    actionLabel={filtered.length === 0 && !showEmpty ? undefined : 'Create project'}
                    onAction={createProject}
                  />
                ) : (
                  <div className="-mx-4 overflow-x-auto px-4">
                    <table className="w-full min-w-[560px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-black/[0.06] text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
                          <th scope="col" className="py-2 pr-3 font-semibold">Project</th>
                          <th scope="col" className="py-2 pr-3 font-semibold">Status</th>
                          <th scope="col" className="py-2 pr-3 font-semibold">Progress</th>
                          <th scope="col" className="py-2 font-semibold"><span className="sr-only">Open</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((p) => (
                          <tr
                            key={p.id}
                            className="group border-b border-black/[0.04] transition-colors duration-150 last:border-0 hover:bg-black/[0.025]"
                          >
                            <td className="py-2.5 pr-3">
                              <div className="flex items-center gap-2.5">
                                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-neutral-900/[0.05] text-[10.5px] font-bold text-neutral-600">
                                  {p.initials}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-[13.5px] font-medium text-neutral-900">{p.name}</p>
                                  <p className="truncate text-[12px] text-neutral-500">{p.owner} · {p.updated}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 pr-3">
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="py-2.5 pr-3">
                              <div className="flex items-center gap-2">
                                <div
                                  role="progressbar"
                                  aria-valuenow={p.progress}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label={`${p.name} progress`}
                                  className="h-1.5 w-24 overflow-hidden rounded-full bg-black/[0.08]"
                                >
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-[width] duration-300',
                                      p.progress === 100 ? 'bg-green-500' : 'bg-[#0071e3]',
                                    )}
                                    style={{ width: `${p.progress}%` }}
                                  />
                                </div>
                                <span className="text-[12px] font-medium text-neutral-500 tabular-nums">{p.progress}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                type="button"
                                aria-label={`Open ${p.name}`}
                                onClick={() => setAnnouncement(`${p.name} opened.`)}
                                className="cursor-pointer rounded-[8px] p-1.5 text-neutral-400 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-black/[0.06] hover:text-neutral-800 focus-visible:opacity-100"
                              >
                                <ArrowUpRight aria-hidden className="size-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ContentCard>

              <p className="flex items-center gap-1.5 text-[12px] text-neutral-400">
                {loading && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
                {loading ? 'Syncing with workspace…' : 'Demonstrates loading, empty, hover, focus, selected and disabled states.'}
              </p>
            </div>
          )}

          {activeId === 'settings' && (
            <form
              className="mt-5 grid max-w-3xl flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setAnnouncement('Settings saved.');
              }}
            >
              <ContentCard title="General" subtitle="Name and defaults for this workspace.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ws-name" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700">
                      Workspace name
                    </label>
                    <input
                      id="ws-name"
                      defaultValue="Aurora Studio"
                      className="h-9 w-full rounded-[10px] border border-black/[0.08] bg-white/80 px-3 text-[13.5px] shadow-sm transition-all duration-200 outline-none hover:border-black/[0.12] focus:border-[#0071e3]/60 focus:ring-[3px] focus:ring-[#0071e3]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="ws-id" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700">
                      Workspace ID <span className="font-normal text-neutral-400">(read-only)</span>
                    </label>
                    <input
                      id="ws-id"
                      defaultValue="aurora-9f31"
                      disabled
                      className="h-9 w-full cursor-not-allowed rounded-[10px] border border-black/[0.06] bg-black/[0.04] px-3 text-[13.5px] text-neutral-400 outline-none"
                    />
                  </div>
                </div>
              </ContentCard>

              <ContentCard title="Notifications" subtitle="Choose how the workspace keeps you posted.">
                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">Notification preferences</legend>
                  {[
                    { id: 'n-mentions', label: 'Mentions and replies', desc: 'Notify me immediately.', checked: true },
                    { id: 'n-review', label: 'Review requests', desc: 'Daily digest at 9:00 AM.', checked: true },
                    { id: 'n-weekly', label: 'Weekly summary', desc: 'Disabled in this demo.', checked: false, disabled: true },
                  ].map((n) => (
                    <label
                      key={n.id}
                      htmlFor={n.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-[10px] border border-black/[0.06] bg-white/60 px-3 py-2.5 transition-colors duration-150',
                        n.disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-black/[0.1] hover:bg-white',
                      )}
                    >
                      <input
                        id={n.id}
                        type="checkbox"
                        defaultChecked={n.checked}
                        disabled={n.disabled}
                        className="size-4 shrink-0 cursor-pointer accent-[#0071e3]"
                      />
                      <span className="flex-1">
                        <span className="block text-[13.5px] font-medium text-neutral-800">{n.label}</span>
                        <span className="block text-[12px] text-neutral-500">{n.desc}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </ContentCard>

              <div className="flex flex-wrap gap-2">
                <PrimaryButton type="submit">Save changes</PrimaryButton>
                <PrimaryButton type="button" variant="secondary" onClick={() => setAnnouncement('Changes discarded.')}>
                  Discard
                </PrimaryButton>
                <PrimaryButton type="button" variant="danger" disabled title="Only workspace owners can delete">
                  Delete workspace
                </PrimaryButton>
              </div>
            </form>
          )}

          {!['overview', 'projects', 'settings'].includes(activeId) && (
            <div className="mt-5">
              <ContentCard>
                <EmptyState
                  icon={Inbox}
                  title={`${meta.title} is empty`}
                  body="Nothing has been added here yet. Items you create or star will appear in this section."
                  actionLabel="Create new item"
                  onAction={createProject}
                />
              </ContentCard>
            </div>
          )}
        </div>
      </DesktopWindow>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={setActiveId}
        onCreate={() => setProjectDialogOpen(true)}
      />

      <NewProjectDialog
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
        onCreate={handleCreateProject}
      />
    </AppShell>
  );
}
