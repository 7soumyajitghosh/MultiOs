/**
 * ProcessManager lifecycle and scheduling tests.
 *
 * These cover the invariants that previously broke silently:
 *   - kill must actually interrupt the task and must not be overwritten
 *   - a schedule must fire once per interval, not once per tick
 *   - a triggered run must not inherit the schedule it was spawned from
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessManager } from './ProcessManager';
import type { ProcessDefinition } from './ProcessTypes';

/** A task that runs forever until its context is aborted. */
function endlessProcess(name = 'Endless'): ProcessDefinition {
  return {
    name,
    type: 'user',
    priority: 'normal',
    execute: (ctx) =>
      new Promise((resolve) => {
        ctx.signal.addEventListener('abort', () => {
          resolve({ success: false, exitCode: 143, error: 'aborted', durationMs: 0 });
        });
      }),
  };
}

/** A task that finishes immediately and successfully. */
function quickProcess(name = 'Quick'): ProcessDefinition {
  return {
    name,
    type: 'user',
    priority: 'normal',
    execute: async () => ({ success: true, exitCode: 0, durationMs: 0 }),
  };
}

let pm: ProcessManager;

beforeEach(() => {
  vi.useFakeTimers();
  pm = new ProcessManager({ schedulerInterval: 100, monitorInterval: 100, maxBufferLines: 5 });
  pm.start();
});

afterEach(() => {
  pm.shutdown();
  vi.useRealTimers();
});

describe('lifecycle', () => {
  it('runs a task to completion', async () => {
    const inst = pm.create(quickProcess());
    await vi.advanceTimersByTimeAsync(1);

    expect(pm.getProcess(inst.pid)?.status).toBe('completed');
    expect(pm.getProcess(inst.pid)?.result?.success).toBe(true);
  });

  it('records a failed task without throwing', async () => {
    const inst = pm.create({
      name: 'Boom',
      type: 'user',
      priority: 'normal',
      execute: async () => {
        throw new Error('kaboom');
      },
    });
    await vi.advanceTimersByTimeAsync(1);

    const done = pm.getProcess(inst.pid);
    expect(done?.status).toBe('failed');
    expect(done?.result?.error).toBe('kaboom');
  });

  it('buffers and trims stdout', async () => {
    const inst = pm.create({
      name: 'Chatty',
      type: 'user',
      priority: 'normal',
      execute: async (ctx) => {
        for (let i = 0; i < 10; i++) ctx.log('info', `line ${i}`);
        return { success: true, exitCode: 0, durationMs: 0 };
      },
    });
    await vi.advanceTimersByTimeAsync(1);

    const stdout = pm.getProcess(inst.pid)?.stdout ?? [];
    expect(stdout).toHaveLength(5); // maxBufferLines
    expect(stdout.at(-1)).toContain('line 9');
  });

  it('pauses and resumes', async () => {
    const inst = pm.create(endlessProcess());

    expect(pm.pauseProcess(inst.pid).status).toBe('paused');
    expect(() => pm.pauseProcess(inst.pid)).toThrow(/not running/);
    expect(pm.resumeProcess(inst.pid).status).toBe('running');
    expect(() => pm.resumeProcess(inst.pid)).toThrow(/not paused/);
  });
});

describe('kill', () => {
  it('aborts the running task and stays killed', async () => {
    const inst = pm.create(endlessProcess());
    expect(pm.getProcess(inst.pid)?.status).toBe('running');

    pm.killProcess(inst.pid);
    await vi.advanceTimersByTimeAsync(1);

    // The task resolves after being killed; it must not overwrite the status.
    expect(pm.getProcess(inst.pid)?.status).toBe('killed');
    expect(pm.getProcess(inst.pid)?.result?.exitCode).toBe(137);
  });

  it('refuses to kill an already terminated process', async () => {
    const inst = pm.create(quickProcess());
    await vi.advanceTimersByTimeAsync(1);

    expect(() => pm.killProcess(inst.pid)).toThrow(/already terminated/);
  });

  it('kills children recursively', async () => {
    const parent = pm.create(endlessProcess('Parent'));
    const child = pm.create(endlessProcess('Child'), {}, parent.pid);

    expect(pm.getProcess(child.pid)?.ppid).toBe(parent.pid);
    expect(pm.getProcess(parent.pid)?.children).toContain(child.pid);

    pm.killProcess(parent.pid);
    await vi.advanceTimersByTimeAsync(1);

    expect(pm.getProcess(child.pid)?.status).toBe('killed');
  });

  it('does not throw when a child was already terminated', async () => {
    const parent = pm.create(endlessProcess('Parent'));
    const child = pm.create(quickProcess('Child'), {}, parent.pid);
    await vi.advanceTimersByTimeAsync(1);
    expect(pm.getProcess(child.pid)?.status).toBe('completed');

    expect(() => pm.killProcess(parent.pid)).not.toThrow();
  });

  it('shutdown terminates everything', async () => {
    pm.create(endlessProcess('A'));
    pm.create(endlessProcess('B'));
    pm.shutdown();

    expect(pm.listProcesses()).toHaveLength(0);
  });
});

describe('scheduler', () => {
  const scheduled = (name: string, schedule: ProcessDefinition['schedule']): ProcessDefinition => ({
    name,
    type: 'background',
    priority: 'low',
    schedule,
    execute: quickProcess(name).execute,
  });

  it('fires an interval schedule once per interval, not once per tick', async () => {
    pm.create(scheduled('Ticker', { type: 'interval', value: 1000 }));

    // schedulerInterval is 100ms. A 1000ms interval must fire ~once, not 10x.
    await vi.advanceTimersByTimeAsync(1000);
    const runsAfterOneInterval = pm.listProcesses().filter((p) => p.definition.name === 'Ticker').length;
    expect(runsAfterOneInterval).toBe(2); // the schedule entry + one triggered run

    await vi.advanceTimersByTimeAsync(1000);
    const runsAfterTwo = pm.listProcesses().filter((p) => p.definition.name === 'Ticker').length;
    expect(runsAfterTwo).toBe(3); // exactly one more
  });

  it('does not spawn a triggered run that inherits the schedule', async () => {
    pm.create(scheduled('Ticker', { type: 'interval', value: 500 }));

    await vi.advanceTimersByTimeAsync(2000);

    const entries = pm.listProcesses().filter((p) => p.definition.name === 'Ticker');
    const scheduledEntries = entries.filter((p) => p.schedule);
    // Exactly one process should own a schedule; every other one is a run.
    expect(scheduledEntries).toHaveLength(1);
  });

  it('fires a once schedule exactly once', async () => {
    pm.create(scheduled('Once', { type: 'once', value: Date.now() + 500 }));

    await vi.advanceTimersByTimeAsync(5000);

    const entries = pm.listProcesses().filter((p) => p.definition.name === 'Once');
    expect(entries).toHaveLength(2); // entry + a single run, never more
  });

  it('honours maxRuns', async () => {
    pm.create(scheduled('Limited', { type: 'interval', value: 200, maxRuns: 2 }));

    await vi.advanceTimersByTimeAsync(5000);

    const runs = pm.listProcesses().filter(
      (p) => p.definition.name === 'Limited' && !p.schedule,
    );
    expect(runs).toHaveLength(2);
  });

  it('advances nextRun so the footer can report the next firing', async () => {
    const entry = pm.create(scheduled('Ticker', { type: 'interval', value: 1000 }));
    const before = pm.getProcess(entry.pid)?.schedule?.nextRun ?? 0;

    await vi.advanceTimersByTimeAsync(1100);

    const after = pm.getProcess(entry.pid)?.schedule?.nextRun ?? 0;
    expect(after).toBeGreaterThan(before);
    expect(Number.isFinite(after)).toBe(true);
  });

  it('fires a cron schedule', async () => {
    const base = new Date('2026-01-01T00:00:00');
    vi.setSystemTime(base);
    pm.create(scheduled('Nightly', { type: 'cron', value: '0 3 * * *' }));

    await vi.advanceTimersByTimeAsync(60_000);

    const entry = pm.getProcess(pm.listProcesses({ namePattern: 'Nightly' })[0].pid);
    const next = entry?.schedule?.nextRun ?? 0;
    // 3 AM is 3 hours after midnight; it must land on that hour, not "tomorrow".
    expect(new Date(next).getHours()).toBe(3);
    expect(next).toBeGreaterThan(base.getTime());
  });
});

describe('resource monitor', () => {
  it('kills a process that exceeds its memory limit', async () => {
    pm.create({
      name: 'Hog',
      type: 'user',
      priority: 'normal',
      memoryLimit: 1024,
      execute: endlessProcess('Hog').execute,
    });

    await vi.advanceTimersByTimeAsync(500);

    const hog = pm.listProcesses({ namePattern: 'Hog' })[0];
    expect(hog.status).toBe('killed');
    expect(hog.stderr.join(' ')).toMatch(/Memory limit exceeded/);
  });
});

describe('queries', () => {
  it('filters by name, type, status and priority', async () => {
    pm.create(quickProcess('Alpha'));
    const beta = pm.create(endlessProcess('Beta'));
    await vi.advanceTimersByTimeAsync(1);

    expect(pm.listProcesses({ namePattern: 'alph' })).toHaveLength(1);
    expect(pm.listProcesses({ type: 'user' })).toHaveLength(2);
    expect(pm.listProcesses({ status: 'completed' })).toHaveLength(1);
    expect(pm.listProcesses({ status: 'running' })[0].pid).toBe(beta.pid);
    expect(pm.listProcesses({ priority: 'normal' })).toHaveLength(2);
    expect(pm.listProcesses({ priority: 'idle' })).toHaveLength(0);
  });

  it('paginates', () => {
    for (let i = 0; i < 5; i++) pm.create(quickProcess(`P${i}`));

    expect(pm.listProcesses({ limit: 2 })).toHaveLength(2);
    expect(pm.listProcesses({ limit: 2, offset: 3 })).toHaveLength(2);
  });

  it('reports non-negative uptime before anything starts', () => {
    const stats = pm.getStats();
    expect(stats.uptime).toBeGreaterThanOrEqual(0);
    expect(stats.total).toBe(0);
  });

  it('aggregates stats', async () => {
    pm.create(quickProcess('Alpha'));
    pm.create(endlessProcess('Beta'));
    await vi.advanceTimersByTimeAsync(1);

    const stats = pm.getStats();
    expect(stats.total).toBe(2);
    expect(stats.byStatus.completed).toBe(1);
    expect(stats.byStatus.running).toBe(1);
    expect(stats.byType.user).toBe(2);
  });

  it('reaps terminated processes', async () => {
    pm.create(quickProcess('Alpha'));
    await vi.advanceTimersByTimeAsync(1);

    expect(pm.listProcesses()).toHaveLength(1);
    expect(pm.cleanup(0)).toBe(1);
    expect(pm.listProcesses()).toHaveLength(0);
  });

  it('enforces the process limit', () => {
    const small = new ProcessManager({ maxProcesses: 1 });
    small.create(quickProcess('One'));
    expect(() => small.create(quickProcess('Two'))).toThrow(/Process limit/);
    small.shutdown();
  });

  it('builds a process tree', () => {
    const parent = pm.create(quickProcess('Parent'));
    pm.create(quickProcess('Child'), {}, parent.pid);

    const tree = pm.getProcessTree();
    const root = tree.find((n) => n.pid === parent.pid);
    expect(root?.children).toHaveLength(1);
    expect(root?.children[0].definition.name).toBe('Child');
  });
});

describe('events', () => {
  it('emits lifecycle events', async () => {
    const seen: string[] = [];
    const handler = (e: { type: string }) => seen.push(e.type);
    pm.on('processEvent', handler);

    pm.create(quickProcess('Alpha'));
    await vi.advanceTimersByTimeAsync(1);
    pm.off('processEvent', handler);
    pm.create(quickProcess('Beta'));

    expect(seen).toContain('process:created');
    expect(seen).toContain('process:started');
    expect(seen).toContain('process:completed');

    const after = seen.length;
    await vi.advanceTimersByTimeAsync(1);
    expect(seen.length).toBe(after); // listener removed
  });
});