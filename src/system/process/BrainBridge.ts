/**
 * Brain Bridge
 *
 * The process layer must not import the AI brain directly: `brain/` targets
 * Node (file system, model gateways, child processes) and lives outside the
 * browser bundle. Instead the host installs a bridge at boot; if no bridge is
 * installed the AI-backed processes fail cleanly with a readable error rather
 * than dragging Node-only modules into a Vite build.
 */

export interface MemoryPruneOptions {
  maxAge: number;
}

export interface BrainBridge {
  /** Human-readable id of the backing implementation, for the UI. */
  readonly id: string;
  runCodingLoop(goal: string): Promise<unknown>;
  runAnimationLoop(goal: string): Promise<unknown>;
  indexCodebase(path: string): Promise<unknown>;
  consolidateMemory(): Promise<unknown>;
  pruneMemory(options: MemoryPruneOptions): Promise<unknown>;
  exportMemory(): Promise<unknown>;
}

let bridge: BrainBridge | null = null;

/** Install the host's brain implementation. Passing `null` detaches it. */
export function setBrainBridge(next: BrainBridge | null): void {
  bridge = next;
}

export function getBrainBridge(): BrainBridge | null {
  return bridge;
}

export function hasBrainBridge(): boolean {
  return bridge !== null;
}

export class BrainUnavailableError extends Error {
  constructor(operation: string) {
    super(
      `No brain bridge is installed, so "${operation}" cannot run in this host. ` +
        `Call setBrainBridge() during boot to enable AI processes.`,
    );
    this.name = 'BrainUnavailableError';
  }
}

/** Resolve the bridge or throw a descriptive error for the process log. */
export function requireBrainBridge(operation: string): BrainBridge {
  if (!bridge) throw new BrainUnavailableError(operation);
  return bridge;
}