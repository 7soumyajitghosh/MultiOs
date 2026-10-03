/**
 * Kernel init sequence and brain-bridge decoupling tests.
 *
 * The browser build must never reach into `brain/` (it targets Node). These
 * tests pin that contract: no bridge means no AI processes, and a spawned AI
 * process fails cleanly rather than exploding.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProcessManager, getProcessManager } from './ProcessManager';
import {
  builtinProcesses,
  brainBackedIds,
  healthMonitorProcess,
  registerBuiltinProcesses,
  windowServerProcess,
  aiCodingLoopProcess,
} from './BuiltinProcesses';
import {
  BrainUnavailableError,
  getBrainBridge,
  hasBrainBridge,
  requireBrainBridge,
  setBrainBridge,
  type BrainBridge,
} from './BrainBridge';

afterEach(() => {
  setBrainBridge(null);
});

describe('brain bridge', () => {
  it('is absent by default', () => {
    expect(hasBrainBridge()).toBe(false);
    expect(getBrainBridge()).toBeNull();
  });

  it('throws a descriptive error when required and missing', () => {
    expect(() => requireBrainBridge('coding loop')).toThrow(BrainUnavailableError);
    expect(() => requireBrainBridge('coding loop')).toThrow(/no brain bridge is installed/i);
  });

  it('round-trips an installed bridge', () => {
    const bridge: BrainBridge = {
      id: 'test',
      runCodingLoop: vi.fn(),
      runAnimationLoop: vi.fn(),
      indexCodebase: vi.fn(),
      consolidateMemory: vi.fn(),
      pruneMemory: vi.fn(),
      exportMemory: vi.fn(),
    };
    setBrainBridge(bridge);

    expect(hasBrainBridge()).toBe(true);
    expect(requireBrainBridge('x').id).toBe('test');

    setBrainBridge(null);
    expect(hasBrainBridge()).toBe(false);
  });
});

describe('registerBuiltinProcesses', () => {
  it('skips AI processes when no bridge is installed', () => {
    const pm = createProcessManager();
    registerBuiltinProcesses(pm);

    const names = pm.listProcesses().map((p) => p.definition.name);
    for (const id of brainBackedIds) {
      const def = builtinProcesses[id];
      expect(names).not.toContain(def.name);
    }
    // Host services still come up so the desktop is functional.
    expect(names).toContain(windowServerProcess.name);
  });

  it('registers AI processes once a bridge exists', () => {
    setBrainBridge({
      id: 'test',
      runCodingLoop: vi.fn(),
      runAnimationLoop: vi.fn(),
      indexCodebase: vi.fn(),
      consolidateMemory: vi.fn(),
      pruneMemory: vi.fn(),
      exportMemory: vi.fn(),
    });

    const pm = createProcessManager();
    registerBuiltinProcesses(pm);

    for (const id of brainBackedIds) {
      expect(pm.listProcesses().map((p) => p.definition.name)).toContain(builtinProcesses[id].name);
    }
  });
});

describe('AI processes without a bridge', () => {
  it('exits 78 with a readable message instead of throwing', async () => {
    const pm = createProcessManager();
    const inst = pm.create(aiCodingLoopProcess);

    await vi.waitFor(() => expect(pm.getProcess(inst.pid)?.status).toBe('failed'));

    const result = pm.getProcess(inst.pid)?.result;
    expect(result?.exitCode).toBe(78);
    expect(result?.error).toMatch(/no brain bridge installed/i);
    expect(pm.getProcess(inst.pid)?.stderr.join(' ')).toMatch(/unavailable/i);
  });

  it('runs for real once a bridge is attached', async () => {
    const runCodingLoop = vi.fn().mockResolvedValue({ ok: true });
    setBrainBridge({
      id: 'test',
      runCodingLoop,
      runAnimationLoop: vi.fn(),
      indexCodebase: vi.fn(),
      consolidateMemory: vi.fn(),
      pruneMemory: vi.fn(),
      exportMemory: vi.fn(),
    });

    const pm = createProcessManager();
    const inst = pm.create(aiCodingLoopProcess, { goal: 'ship it' });

    await vi.waitFor(() => expect(pm.getProcess(inst.pid)?.status).toBe('completed'));
    expect(runCodingLoop).toHaveBeenCalledWith('ship it');
    expect(pm.getProcess(inst.pid)?.result?.output).toEqual({ ok: true });
  });

  it('reports a throwing bridge as a failure, not a crash', async () => {
    setBrainBridge({
      id: 'test',
      runCodingLoop: vi.fn().mockRejectedValue(new Error('model unavailable')),
      runAnimationLoop: vi.fn(),
      indexCodebase: vi.fn(),
      consolidateMemory: vi.fn(),
      pruneMemory: vi.fn(),
      exportMemory: vi.fn(),
    });

    const pm = createProcessManager();
    const inst = pm.create(aiCodingLoopProcess);

    await vi.waitFor(() => expect(pm.getProcess(inst.pid)?.status).toBe('failed'));
    expect(pm.getProcess(inst.pid)?.result?.error).toBe('model unavailable');
  });
});

describe('host services', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('heartbeat until aborted, then report the stop', async () => {
    const pm = createProcessManager();
    const inst = pm.create(windowServerProcess);

    await vi.advanceTimersByTimeAsync(3000);
    expect(pm.getProcess(inst.pid)?.status).toBe('running');

    pm.killProcess(inst.pid);
    await vi.advanceTimersByTimeAsync(1);

    expect(pm.getProcess(inst.pid)?.status).toBe('killed');
    expect(pm.getProcess(inst.pid)?.stdout.join(' ')).toMatch(/stopped after/);
  });
});

describe('health monitor', () => {
  // healthMonitorProcess is scheduled, so create() registers a dormant entry.
  // triggerNow() is what actually runs it — that is the path Activity Monitor uses.
  it('stays dormant until triggered, then reports no issues', async () => {
    const pm = createProcessManager();
    const entry = pm.create(healthMonitorProcess);
    expect(pm.getProcess(entry.pid)?.status).toBe('created');

    const run = pm.triggerNow(entry.pid);
    await vi.waitFor(() => expect(pm.getProcess(run.pid)?.status).toBe('completed'));

    const output = pm.getProcess(run.pid)?.result?.output as { healthy: boolean; issues: string[] };
    expect(output.healthy).toBe(true);
    expect(output.issues).toEqual([]);
  });

  it('flags a high process count', async () => {
    const pm = createProcessManager();
    const entry = pm.create(healthMonitorProcess);

    for (let i = 0; i < 201; i++) {
      pm.create({
        name: `Filler${i}`,
        type: 'background',
        priority: 'idle',
        execute: async () => new Promise(() => {}), // never resolves
      });
    }

    const run = pm.triggerNow(entry.pid);
    await vi.waitFor(() => expect(pm.getProcess(run.pid)?.status).toBe('completed'));

    const output = pm.getProcess(run.pid)?.result?.output as { issues: string[] };
    expect(output.issues.join(' ')).toMatch(/High process count/);
  });

  it('triggerNow does not disturb the recurring schedule', async () => {
    const pm = createProcessManager();
    const entry = pm.create(healthMonitorProcess);
    const nextRun = pm.getProcess(entry.pid)?.schedule?.nextRun;

    pm.triggerNow(entry.pid);
    await vi.waitFor(() => expect(pm.listProcesses().length).toBe(2));

    expect(pm.getProcess(entry.pid)?.schedule?.nextRun).toBe(nextRun);
  });
});

describe('singleton', () => {
  it('returns the same manager on repeat calls', () => {
    expect(getProcessManager()).toBe(getProcessManager());
  });
});