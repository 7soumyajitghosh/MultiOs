/**
 * Activity Monitor
 *
 * Process supervisor for Aurora. Shows live process state on the left and the
 * full ProcessList on the right, and can launch the built-in services so the
 * table is not empty on a fresh boot.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Cpu,
  Gauge,
  HardDrive,
  Play,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { ProcessList } from '../components/ProcessList';
import { cn } from '../lib/cn';
import { getProcessManager, type ProcessInstance } from '../system/process';
import { getKernelState, spawnProcess, subscribeKernel, type KernelState } from '../system/kernel';

interface Props {
  dark: boolean;
}

interface Shortcut {
  id: string;
  label: string;
  hint: string;
  Icon: typeof Cpu;
  args?: Record<string, unknown>;
}

/** Everything the sidebar can start on demand. */
const LAUNCHABLES: Shortcut[] = [
  { id: 'system:health-monitor', label: 'Health Monitor', hint: 'Run a health check now', Icon: Activity },
  { id: 'system:codebase-index', label: 'Codebase Indexer', hint: 'Needs AI brain bridge', Icon: HardDrive },
  { id: 'ai:coding-loop', label: 'Coding Agent', hint: 'Autonomous code loop', Icon: Bot, args: { goal: 'Review the codebase' } },
  { id: 'ai:animation-loop', label: 'Animation Agent', hint: 'Animation analysis', Icon: Gauge },
];

export function ActivityMonitorApp({ dark }: Props) {
  const [kernel, setKernel] = useState<KernelState>(() => getKernelState());
  const [selected, setSelected] = useState<ProcessInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeKernel(setKernel), []);

  const pm = useMemo(() => getProcessManager(), []);

  const run = (shortcut: Shortcut) => {
    try {
      // spawnProcess triggers scheduled definitions immediately rather than
      // creating a dormant entry that waits for its next firing.
      spawnProcess(shortcut.id, shortcut.args ?? {});
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className={cn('flex h-full min-h-0', dark ? 'text-white' : 'text-neutral-900')}>
      {/* Sidebar */}
      <aside
        className={cn(
          'hidden w-56 shrink-0 flex-col overflow-y-auto border-r p-3 sm:flex',
          dark ? 'border-white/10 bg-black/20' : 'border-black/[0.06] bg-black/[0.02]',
        )}
      >
        <h2 className="px-1 pb-2 text-[11px] font-semibold tracking-wide uppercase opacity-45">
          Services
        </h2>
        <div className="flex flex-col gap-1">
          {LAUNCHABLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => run(s)}
              className={cn(
                'group flex cursor-pointer items-start gap-2.5 rounded-lg p-2 text-left transition',
                dark ? 'hover:bg-white/[0.07]' : 'hover:bg-black/[0.04]',
              )}
            >
              <s.Icon
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  dark ? 'text-white/45' : 'text-neutral-500',
                )}
              />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium">{s.label}</span>
                <span className="block truncate text-[11px] opacity-50">{s.hint}</span>
              </span>
              <Play
                className={cn(
                  'mt-0.5 ml-auto size-3 shrink-0 opacity-0 transition group-hover:opacity-60',
                )}
              />
            </button>
          ))}
        </div>

        <div className={cn('my-3 h-px', dark ? 'bg-white/10' : 'bg-black/[0.08]')} />

        <h2 className="px-1 pb-2 text-[11px] font-semibold tracking-wide uppercase opacity-45">
          Kernel
        </h2>
        <dl className="flex flex-col gap-1.5 px-1 text-[11.5px]">
          <Row label="Phase" value={kernel.phase} dark={dark} />
          <Row label="Boot time" value={`${kernel.bootMs.toFixed(1)}ms`} dark={dark} />
          <Row label="Registered" value={String(kernel.registered)} dark={dark} />
          <Row label="AI brain" value={kernel.brainAttached ? 'attached' : 'not installed'} dark={dark} />
        </dl>
      </aside>

      {/* Table */}
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="mb-2 flex items-center gap-2">
          <Terminal className={cn('size-4', dark ? 'text-white/50' : 'text-neutral-500')} />
          <h1 className="text-[13.5px] font-semibold">Processes</h1>
          <span className={cn('text-[11.5px]', dark ? 'text-white/40' : 'text-neutral-500')}>
            {selected ? `PID ${selected.pid} selected` : 'select a row for detail'}
          </span>
          <button
            type="button"
            onClick={() => pm.cleanup(0)}
            title="Reap terminated processes"
            className={cn(
              'ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] transition',
              dark ? 'bg-white/8 text-white/60 hover:bg-white/14' : 'bg-black/[0.05] text-neutral-600 hover:bg-black/[0.09]',
            )}
          >
            <RefreshCw className="size-3" />
            Reap
          </button>
        </div>

        {error && (
          <p className="mb-2 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[11.5px] text-red-500">
            {error}
          </p>
        )}

        <ProcessList dark={dark} onSelectProcess={setSelected} className="flex-1" />
      </div>
    </div>
  );
}

function Row({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className={dark ? 'text-white/45' : 'text-neutral-500'}>{label}</dt>
      <dd className={cn('truncate font-medium', dark ? 'text-white/80' : 'text-neutral-800')}>
        {value}
      </dd>
    </div>
  );
}