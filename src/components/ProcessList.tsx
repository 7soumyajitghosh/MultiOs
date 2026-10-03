/**
 * Process List
 *
 * Live table of processes from the ProcessManager: sort, filter, search and
 * per-process controls. Drives off the manager's `processEvent` stream plus a
 * low-frequency poll so uptime and resource columns stay fresh.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Cpu,
  Loader2,
  Monitor,
  Pause,
  PauseCircle,
  Play,
  Search,
  Settings,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '../lib/cn';
import {
  getProcessManager,
  type ProcessInstance,
  type ProcessManager,
  type ProcessPriority,
  type ProcessStatus,
  type ProcessType,
} from '../system/process';

export interface ProcessListProps {
  dark?: boolean;
  onSelectProcess?: (process: ProcessInstance | null) => void;
  className?: string;
}

type SortKey = 'pid' | 'name' | 'status' | 'priority' | 'cpu' | 'memory' | 'uptime';

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

/** Static class strings — Tailwind cannot see interpolated class names. */
const STATUS_CONFIG: Record<
  ProcessStatus,
  { icon: typeof Circle; label: string; chip: string; dot: string }
> = {
  created: {
    icon: Circle,
    label: 'Created',
    chip: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300',
    dot: 'bg-neutral-400',
  },
  running: {
    icon: CheckCircle,
    label: 'Running',
    chip: 'bg-green-500/12 text-green-700 dark:text-green-400',
    dot: 'bg-green-500',
  },
  paused: {
    icon: PauseCircle,
    label: 'Paused',
    chip: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  waiting: {
    icon: Clock,
    label: 'Waiting',
    chip: 'bg-blue-500/12 text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  completed: {
    icon: CheckCircle,
    label: 'Done',
    chip: 'bg-teal-500/12 text-teal-700 dark:text-teal-400',
    dot: 'bg-teal-500',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    chip: 'bg-red-500/12 text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  killed: {
    icon: XCircle,
    label: 'Killed',
    chip: 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400',
    dot: 'bg-neutral-500',
  },
};

const PRIORITY_CHIP: Record<ProcessPriority, string> = {
  realtime: 'bg-red-500/12 text-red-700 dark:text-red-400',
  high: 'bg-orange-500/12 text-orange-700 dark:text-orange-400',
  normal: 'bg-blue-500/12 text-blue-700 dark:text-blue-400',
  low: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300',
  idle: 'bg-neutral-400/10 text-neutral-400',
};

const PRIORITY_ORDER: Record<ProcessPriority, number> = {
  realtime: 5,
  high: 4,
  normal: 3,
  low: 2,
  idle: 1,
};

const TYPE_CONFIG: Record<ProcessType, { icon: typeof Bot; label: string; tint: string }> = {
  system: { icon: Settings, label: 'System', tint: 'text-neutral-400' },
  user: { icon: Terminal, label: 'User', tint: 'text-sky-500' },
  'ai-agent': { icon: Bot, label: 'AI Agent', tint: 'text-violet-500' },
  background: { icon: Cpu, label: 'Background', tint: 'text-amber-500' },
  scheduled: { icon: Clock, label: 'Scheduled', tint: 'text-teal-500' },
};

const TYPE_ORDER: ProcessType[] = ['system', 'user', 'ai-agent', 'background', 'scheduled'];
const STATUS_ORDER: ProcessStatus[] = [
  'running',
  'created',
  'waiting',
  'paused',
  'completed',
  'failed',
  'killed',
];
const PRIORITIES: ProcessPriority[] = ['realtime', 'high', 'normal', 'low', 'idle'];

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0B';
  if (bytes < 1024) return `${Math.round(bytes)}B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)}GB`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const COLUMNS: { key: SortKey | 'actions'; label: string; className: string }[] = [
  { key: 'pid', label: 'PID', className: 'w-14' },
  { key: 'name', label: 'Process', className: 'min-w-[180px] flex-1' },
  { key: 'status', label: 'Status', className: 'w-28' },
  { key: 'priority', label: 'Priority', className: 'w-24' },
  { key: 'cpu', label: 'CPU', className: 'w-16 text-right' },
  { key: 'memory', label: 'Memory', className: 'w-20 text-right' },
  { key: 'uptime', label: 'Uptime', className: 'w-24 text-right' },
  { key: 'actions', label: '', className: 'w-16' },
];

export function ProcessList({ dark = false, onSelectProcess, className }: ProcessListProps) {
  const [processes, setProcesses] = useState<ProcessInstance[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProcessType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ProcessStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ProcessPriority | ''>('');
  const [sort, setSort] = useState<SortConfig>({ key: 'priority', direction: 'desc' });
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState<string | null>(null);

  const pm: ProcessManager = useMemo(() => getProcessManager(), []);

  const refresh = useCallback(() => {
    setProcesses(
      pm.listProcesses({
        namePattern: search.trim() || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      }),
    );
  }, [pm, search, typeFilter, statusFilter, priorityFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // One timer drives both the wall-clock uptime column and the table itself.
  // Refreshing the list here (rather than only on filter change) is what makes
  // the "Live" toggle actually live — otherwise rows only update by accident
  // when something else happens to trigger a refresh.
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      setNow(Date.now());
      refresh();
    }, 1000);
    return () => clearInterval(t);
  }, [autoRefresh, refresh]);

  const sorted = useMemo(() => {
    const dir = sort.direction === 'desc' ? -1 : 1;
    return [...processes].sort((a, b) => {
      switch (sort.key) {
        case 'name':
          return dir * a.definition.name.localeCompare(b.definition.name);
        case 'status':
          return (
            dir *
            (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) ||
            a.pid - b.pid
          );
        case 'priority':
          return (
            dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) || a.pid - b.pid
          );
        case 'cpu':
          return dir * (a.resources.cpuPercent - b.resources.cpuPercent);
        case 'memory':
          return dir * (a.resources.memoryBytes - b.resources.memoryBytes);
        case 'uptime':
          return dir * (a.resources.startTime - b.resources.startTime);
        case 'pid':
        default:
          return dir * (a.pid - b.pid);
      }
    });
  }, [processes, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
        : { key, direction: key === 'name' ? 'asc' : 'desc' },
    );

  const control = useCallback(
    (pid: number, action: 'pause' | 'resume' | 'kill') => {
      try {
        if (action === 'pause') pm.pauseProcess(pid);
        else if (action === 'resume') pm.resumeProcess(pid);
        else pm.killProcess(pid);
        setNotice(null);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : String(error));
      }
      refresh();
    },
    [pm, refresh],
  );

  const selected = useMemo(
    () => (selectedPid === null ? null : (processes.find((p) => p.pid === selectedPid) ?? null)),
    [processes, selectedPid],
  );

  // Only notify on a real selection change. `selected` is a fresh object on every
  // poll, so keying the notification on identity would fire every second.
  const selectedKey = selected ? `${selected.pid}:${selected.status}:${selected.updatedAt}` : null;
  useEffect(() => {
    onSelectProcess?.(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const hasFilters = Boolean(search.trim() || typeFilter || statusFilter || priorityFilter);

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-xl border',
        dark ? 'border-white/10 bg-black/25 text-white' : 'border-black/[0.07] bg-white/60',
        className,
      )}
    >
      {/* Toolbar */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 border-b px-3 py-2',
          dark ? 'border-white/10' : 'border-black/[0.06]',
        )}
      >
        <div className="relative min-w-[160px] flex-1">
          <Search
            aria-hidden
            className={cn(
              'pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2',
              dark ? 'text-white/40' : 'text-neutral-400',
            )}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter processes"
            aria-label="Filter processes by name"
            className={cn(
              'h-8 w-full rounded-lg border bg-transparent pr-2.5 pl-8 text-[12.5px] outline-none transition',
              dark
                ? 'border-white/12 bg-white/5 text-white placeholder:text-white/35 focus:border-white/30'
                : 'border-black/10 bg-white/80 text-neutral-900 placeholder:text-neutral-400 focus:border-[#0071e3]/60',
            )}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ProcessType | '')}
          aria-label="Filter by process type"
          className={selectClass(dark)}
        >
          <option value="">All types</option>
          {TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {TYPE_CONFIG[t].label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProcessStatus | '')}
          aria-label="Filter by status"
          className={selectClass(dark)}
        >
          <option value="">All states</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as ProcessPriority | '')}
          aria-label="Filter by priority"
          className={selectClass(dark)}
        >
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setAutoRefresh((v) => !v)}
          aria-pressed={autoRefresh}
          title={autoRefresh ? 'Pause live updates' : 'Resume live updates'}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-lg border px-2 text-[11.5px] font-medium transition',
            autoRefresh
              ? dark
                ? 'border-green-400/30 bg-green-500/10 text-green-300'
                : 'border-green-500/25 bg-green-500/10 text-green-700'
              : dark
                ? 'border-white/12 bg-white/5 text-white/55'
                : 'border-black/10 bg-white/80 text-neutral-600',
          )}
        >
          <Loader2 className={cn('size-3.5', autoRefresh && 'animate-spin')} />
          {autoRefresh ? 'Live' : 'Paused'}
        </button>
      </div>

      {/* Column header */}
      <div
        className={cn(
          'flex items-center gap-2 border-b px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase',
          dark ? 'border-white/10 text-white/35' : 'border-black/[0.06] text-neutral-400',
        )}
      >
        {COLUMNS.map((col) => {
          const sortable = col.key !== 'actions';
          return (
            <button
              key={col.key}
              type="button"
              onClick={sortable ? () => toggleSort(col.key as SortKey) : undefined}
              disabled={!sortable}
              className={cn(
                'flex shrink-0 items-center gap-1 text-left transition',
                col.className,
                sortable && (dark ? 'hover:text-white/70' : 'hover:text-neutral-600'),
              )}
            >
              {col.label}
              {sort.key === col.key &&
                (sort.direction === 'desc' ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronUp className="size-3" />
                ))}
            </button>
          );
        })}
      </div>

      {/* Rows */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div
            className={cn(
              'flex h-full flex-col items-center justify-center gap-2 px-6 text-center',
              dark ? 'text-white/40' : 'text-neutral-500',
            )}
          >
            <Monitor className="size-10 opacity-40" />
            <p className="text-[13px] font-medium">
              {hasFilters ? 'No matching processes' : 'No processes running'}
            </p>
            <p className="text-[12px] opacity-75">
              {hasFilters ? 'Clear the filters to see everything.' : 'Start one from the sidebar.'}
            </p>
          </div>
        ) : (
          <ul role="list">
            {sorted.map((proc) => {
              const status = STATUS_CONFIG[proc.status];
              const StatusIcon = status.icon;
              const type = TYPE_CONFIG[proc.definition.type];
              const TypeIcon = type.icon;
              const isSelected = proc.pid === selectedPid;
              const canPause = proc.status === 'running';
              const canResume = proc.status === 'paused';
              const canKill = canPause || canResume || proc.status === 'waiting' || proc.status === 'created';

              return (
                <li key={proc.pid}>
                  <div
                    onClick={() => setSelectedPid((prev) => (prev === proc.pid ? null : proc.pid))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPid((prev) => (prev === proc.pid ? null : proc.pid));
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-left transition-colors',
                      dark
                        ? 'border-white/5 hover:bg-white/[0.04]'
                        : 'border-black/[0.03] hover:bg-black/[0.02]',
                      isSelected && (dark ? 'bg-white/[0.07]' : 'bg-[#0071e3]/[0.07]'),
                    )}
                  >
                    <span
                      className={cn(
                        'w-14 shrink-0 font-mono text-[11.5px] tabular-nums',
                        dark ? 'text-white/45' : 'text-neutral-500',
                      )}
                    >
                      {proc.pid}
                    </span>

                    <span className="flex min-w-[180px] flex-1 items-center gap-2">
                      <TypeIcon className={cn('size-3.5 shrink-0', type.tint)} />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium">
                          {proc.definition.name}
                        </span>
                        <span
                          className={cn(
                            'block truncate text-[11px]',
                            dark ? 'text-white/40' : 'text-neutral-500',
                          )}
                        >
                          {proc.definition.description ?? type.label}
                        </span>
                      </span>
                    </span>

                    <span className="w-28 shrink-0">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                          status.chip,
                        )}
                      >
                        <StatusIcon className="size-3" />
                        {status.label}
                      </span>
                    </span>

                    <span className="w-24 shrink-0">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                          PRIORITY_CHIP[proc.priority],
                        )}
                      >
                        {proc.priority}
                      </span>
                    </span>

                    <span
                      className={cn(
                        'w-16 shrink-0 text-right font-mono text-[11.5px] tabular-nums',
                        dark ? 'text-white/60' : 'text-neutral-600',
                      )}
                    >
                      {proc.resources.cpuPercent.toFixed(0)}%
                    </span>

                    <span
                      className={cn(
                        'w-20 shrink-0 text-right font-mono text-[11.5px] tabular-nums',
                        dark ? 'text-white/60' : 'text-neutral-600',
                      )}
                    >
                      {formatBytes(proc.resources.memoryBytes)}
                    </span>

                    <span
                      className={cn(
                        'w-24 shrink-0 text-right font-mono text-[11.5px] tabular-nums',
                        dark ? 'text-white/45' : 'text-neutral-500',
                      )}
                    >
                      {formatDuration(now - proc.resources.startTime)}
                    </span>

                    <span className="flex w-16 shrink-0 items-center justify-end gap-0.5">
                      {canPause && (
                        <IconAction
                          label={`Pause ${proc.definition.name}`}
                          onClick={() => control(proc.pid, 'pause')}
                          dark={dark}
                          hover="hover:bg-amber-500/15 hover:text-amber-500"
                        >
                          <Pause className="size-3.5" />
                        </IconAction>
                      )}
                      {canResume && (
                        <IconAction
                          label={`Resume ${proc.definition.name}`}
                          onClick={() => control(proc.pid, 'resume')}
                          dark={dark}
                          hover="hover:bg-green-500/15 hover:text-green-500"
                        >
                          <Play className="size-3.5" />
                        </IconAction>
                      )}
                      {canKill && (
                        <IconAction
                          label={`Kill ${proc.definition.name}`}
                          onClick={() => control(proc.pid, 'kill')}
                          dark={dark}
                          hover="hover:bg-red-500/15 hover:text-red-500"
                        >
                          <X className="size-3.5" />
                        </IconAction>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer / selection detail */}
      <div
        className={cn(
          'shrink-0 border-t px-3 py-1.5 text-[11px]',
          dark ? 'border-white/10 text-white/45' : 'border-black/[0.06] text-neutral-500',
        )}
      >
        {notice ? (
          <span className="text-red-500">{notice}</span>
        ) : selected ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="font-medium">PID {selected.pid}</span>
            <span>{TYPE_CONFIG[selected.definition.type].label}</span>
            <span>env: {Object.keys(selected.definition.env ?? {}).length}</span>
            <span>cpu time: {formatDuration(selected.resources.cpuTimeMs)}</span>
            {selected.schedule && (
              <span>
                schedule: {selected.schedule.type} · run {selected.schedule.runCount ?? 0}
                {selected.schedule.nextRun && Number.isFinite(selected.schedule.nextRun)
                  ? ` · next in ${formatDuration(Math.max(0, selected.schedule.nextRun - now))}`
                  : ' · exhausted'}
              </span>
            )}
            {selected.result && (
              <span className={selected.result.success ? '' : 'text-red-500'}>
                exit {selected.result.exitCode}
                {selected.result.error ? ` · ${selected.result.error}` : ''}
              </span>
            )}
          </div>
        ) : (
          <span>
            {processes.length} process{processes.length === 1 ? '' : 'es'} · select a row for
            detail
          </span>
        )}
      </div>
    </div>
  );
}

function selectClass(dark: boolean) {
  return cn(
    'h-8 max-w-[130px] rounded-lg border px-2 text-[11.5px] outline-none transition',
    dark
      ? 'border-white/12 bg-white/5 text-white focus:border-white/30'
      : 'border-black/10 bg-white/80 text-neutral-800 focus:border-[#0071e3]/60',
  );
}

function IconAction({
  label,
  onClick,
  hover,
  dark,
  children,
}: {
  label: string;
  onClick: () => void;
  hover: string;
  dark: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'rounded-md p-1.5 transition-colors',
        dark ? 'text-white/45' : 'text-neutral-500',
        hover,
      )}
    >
      {children}
    </button>
  );
}