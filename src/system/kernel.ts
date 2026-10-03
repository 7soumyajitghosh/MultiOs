/**
 * Kernel — Aurora's userland init sequence.
 *
 * Mirrors the ordering of the real `kernel/kernel.c` kmain(): bring up the
 * console and subsystems, start the scheduler, then hand control to the shell.
 * Everything here is idempotent so a reboot can tear the system down and build
 * it back up without leaking timers or listeners.
 */

import {
  builtinProcesses,
  getProcessManager,
  registerBuiltinProcesses,
  setBrainBridge,
  hasBrainBridge,
  type BrainBridge,
  type ProcessInstance,
  type ProcessManager,
} from './process';

export type KernelPhase = 'cold' | 'booting' | 'running' | 'halted';

export interface KernelState {
  phase: KernelPhase;
  bootMs: number;
  registered: number;
  pid: number;
  brainAttached: boolean;
}

type KernelListener = (state: KernelState) => void;

let state: KernelState = {
  phase: 'cold',
  bootMs: 0,
  registered: 0,
  pid: 0,
  brainAttached: false,
};

const listeners = new Set<KernelListener>();

function publish(next: Partial<KernelState>) {
  state = { ...state, ...next };
  for (const fn of listeners) fn(state);
}

export function getKernelState(): KernelState {
  return state;
}

export function subscribeKernel(fn: KernelListener): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

/**
 * Bring up the process subsystem.
 *
 * `brain` is optional — the desktop runs fine without it, and AI processes are
 * simply not registered when no bridge is supplied.
 */
export function bootKernel(options: { brain?: BrainBridge | null } = {}): KernelState {
  if (state.phase === 'running' || state.phase === 'booting') return state;

  const startedAt = performance.now();
  publish({ phase: 'booting' });

  if (options.brain !== undefined) setBrainBridge(options.brain);

  const pm: ProcessManager = getProcessManager();
  pm.start();
  const registered = registerBuiltinProcesses(pm);

  publish({
    phase: 'running',
    bootMs: performance.now() - startedAt,
    registered: registered.length,
    pid: getKernelPid(),
    brainAttached: hasBrainBridge(),
  });

  return state;
}

export function shutdownKernel(): void {
  if (state.phase === 'cold' || state.phase === 'halted') return;
  getProcessManager().shutdown();
  publish({ phase: 'halted' });
}

export function rebootKernel(): KernelState {
  shutdownKernel();
  return bootKernel();
}

function getKernelPid(): number {
  const processes = getProcessManager().listProcesses();
  return processes.length > 0 ? processes[0].pid : 0;
}

/**
 * Run a registered built-in now.
 *
 * Scheduled definitions are triggered immediately as a one-off child rather
 * than being re-created, so clicking "Health Monitor" in Activity Monitor does
 * something instead of quietly adding a dormant entry.
 */
export function spawnProcess(id: string, args: Record<string, unknown> = {}): ProcessInstance {
  const def = builtinProcesses[id];
  if (!def) throw new Error(`Unknown process id: ${id}`);

  const pm = getProcessManager();

  // A scheduled definition needs an existing entry to trigger against.
  const existing = def.schedule
    ? pm.listProcesses({ namePattern: def.name }).find((p) => p.schedule)
    : undefined;

  if (existing) {
    if (Object.keys(args).length > 0) {
      pm.getProcess(existing.pid)!.args = { ...pm.getProcess(existing.pid)!.args, ...args };
    }
    return pm.triggerNow(existing.pid);
  }

  return pm.create(def, args);
}