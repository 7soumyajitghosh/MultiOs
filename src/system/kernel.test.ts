/**
 * Kernel init sequence tests.
 *
 * `getProcessManager()` is a module singleton, so these tests run the real boot
 * path and assert on observable state rather than trying to isolate instances.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bootKernel,
  getKernelState,
  rebootKernel,
  shutdownKernel,
  spawnProcess,
  subscribeKernel,
} from './kernel';
import { getProcessManager, setBrainBridge, windowServerProcess } from './process';

afterEach(() => {
  setBrainBridge(null);
  shutdownKernel();
});

describe('boot', () => {
  it('reaches the running phase and registers host services', () => {
    bootKernel();
    const state = getKernelState();

    expect(state.phase).toBe('running');
    expect(state.registered).toBeGreaterThan(0);
    expect(state.bootMs).toBeGreaterThanOrEqual(0);
    expect(state.brainAttached).toBe(false);

    const names = getProcessManager().listProcesses().map((p) => p.definition.name);
    expect(names).toContain(windowServerProcess.name);
  });

  it('is idempotent', () => {
    bootKernel();
    const first = getKernelState();
    bootKernel();
    bootKernel();

    expect(getKernelState().registered).toBe(first.registered);
  });

  it('reports a brain bridge when one is supplied', () => {
    setBrainBridge({
      id: 'test',
      runCodingLoop: async () => null,
      runAnimationLoop: async () => null,
      indexCodebase: async () => null,
      consolidateMemory: async () => null,
      pruneMemory: async () => null,
      exportMemory: async () => null,
    });

    bootKernel();
    expect(getKernelState().brainAttached).toBe(true);
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const seen: string[] = [];
    const unsubscribe = subscribeKernel((s) => seen.push(s.phase));

    bootKernel();
    expect(seen).toContain('running');

    unsubscribe();
    const countAtUnsubscribe = seen.length;
    shutdownKernel();
    expect(seen.length).toBe(countAtUnsubscribe);
  });
});

describe('shutdown and reboot', () => {
  it('halts and clears every process', () => {
    bootKernel();
    expect(getProcessManager().listProcesses().length).toBeGreaterThan(0);

    shutdownKernel();

    expect(getKernelState().phase).toBe('halted');
    expect(getProcessManager().listProcesses()).toHaveLength(0);
  });

  it('rebuilds the system from halted', () => {
    bootKernel();
    shutdownKernel();
    rebootKernel();

    const state = getKernelState();
    expect(state.phase).toBe('running');
    expect(getProcessManager().listProcesses().length).toBeGreaterThan(0);
  });

  it('is safe to shut down twice', () => {
    bootKernel();
    shutdownKernel();
    expect(shutdownKernel()).toBeUndefined();
    expect(getKernelState().phase).toBe('halted');
  });
});

describe('spawnProcess', () => {
  it('starts an unscheduled built-in immediately', () => {
    bootKernel();
    const before = getProcessManager().listProcesses().length;
    spawnProcess('system:window-server');

    expect(getProcessManager().listProcesses().length).toBe(before + 1);
  });

  it('runs a scheduled built-in now instead of adding a dormant entry', async () => {
    bootKernel();
    // The health monitor is registered by boot as a dormant schedule entry.
    const before = getProcessManager().listProcesses({ namePattern: 'System Health Monitor' }).length;

    const spawned = spawnProcess('system:health-monitor');

    await vi.waitFor(() =>
      expect(getProcessManager().getProcess(spawned.pid)?.status).toBe('completed'),
    );
    expect(spawned.schedule).toBeUndefined();
    expect(getProcessManager().listProcesses({ namePattern: 'System Health Monitor' }).length).toBe(
      before + 1,
    );
  });

  it('rejects an unknown id', () => {
    bootKernel();
    expect(() => spawnProcess('nope:nothing')).toThrow(/Unknown process id/);
  });
});