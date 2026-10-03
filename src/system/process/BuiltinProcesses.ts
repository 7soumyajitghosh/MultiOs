/**
 * Built-in System Processes
 *
 * Core OS processes that provide essential functionality.
 *
 * AI-backed definitions resolve the brain lazily through `BrainBridge`, so this
 * module stays importable from the browser bundle. See ./BrainBridge.ts.
 */

import type {
  ProcessDefinition,
  ProcessContext,
  ProcessResult,
  ProcessPriority,
  ProcessType,
} from './ProcessTypes';
import { hasBrainBridge, requireBrainBridge } from './BrainBridge';

/** Wrap a brain call so a missing bridge or a thrown error becomes a clean exit. */
async function withBrain<T>(
  context: ProcessContext,
  operation: string,
  run: (b: ReturnType<typeof requireBrainBridge>) => Promise<T>,
): Promise<ProcessResult> {
  if (!hasBrainBridge()) {
    const error = `AI capability "${operation}" is unavailable: no brain bridge installed.`;
    context.log('error', error);
    return { success: false, exitCode: 78, error, durationMs: 0 };
  }

  try {
    const output = await run(requireBrainBridge(operation));
    context.emit('progress', { stage: 'complete', message: `${operation} finished` });
    context.log('info', `${operation} completed`);
    return { success: true, exitCode: 0, output, durationMs: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.log('error', `${operation} failed: ${message}`);
    return { success: false, exitCode: 1, error: message, durationMs: 0 };
  }
}

// AI Brain Autonomous Coding Loop Process
export const aiCodingLoopProcess: ProcessDefinition = {
  name: 'AI Coding Agent',
  type: 'ai-agent',
  priority: 'normal',
  description:
    'Autonomous coding loop: observe -> understand -> plan -> build -> run -> test -> analyze -> fix -> retest -> review -> optimize -> verify',
  tags: ['ai', 'coding', 'autonomous'],
  execute: (context) => {
    const goal = (context.args.goal as string) || 'Improve codebase';
    context.log('info', `Starting autonomous coding loop for: ${goal}`);
    context.emit('progress', { stage: 'observe', message: 'Observing codebase...' });
    return withBrain(context, 'coding loop', (b) => b.runCodingLoop(goal));
  },
};

// AI Animation Loop Process
export const aiAnimationLoopProcess: ProcessDefinition = {
  name: 'AI Animation Agent',
  type: 'ai-agent',
  priority: 'normal',
  description:
    'Autonomous animation loop: observe -> understand -> reconstruct -> render -> compare -> find difference -> improve -> render again',
  tags: ['ai', 'animation', 'autonomous'],
  execute: (context) => {
    const goal = (context.args.goal as string) || 'Analyze and improve animations';
    context.log('info', `Starting autonomous animation loop for: ${goal}`);
    context.emit('progress', { stage: 'observe', message: 'Observing animations...' });
    return withBrain(context, 'animation loop', (b) => b.runAnimationLoop(goal));
  },
};

// Codebase Indexing Process
export const codebaseIndexProcess: ProcessDefinition = {
  name: 'Codebase Indexer',
  type: 'background',
  priority: 'low',
  description:
    'Indexes codebase for AI understanding: parses symbols, builds dependency graphs, extracts architecture',
  tags: ['indexing', 'codebase', 'background'],
  schedule: {
    type: 'interval',
    value: 5 * 60 * 1000, // Every 5 minutes
  },
  execute: (context) => {
    const path = (context.args.path as string) || '.';
    context.log('info', `Starting codebase indexing for: ${path}`);
    context.emit('progress', { stage: 'parse', message: 'Parsing source files...' });
    return withBrain(context, 'codebase indexing', (b) => b.indexCodebase(path));
  },
};

// Memory Consolidation Process
export const memoryConsolidationProcess: ProcessDefinition = {
  name: 'Memory Consolidation',
  type: 'system',
  priority: 'idle',
  description: 'Consolidates AI memory: summarizes activity, extracts patterns, prunes old entries',
  tags: ['memory', 'maintenance', 'ai'],
  schedule: {
    type: 'cron',
    value: '0 3 * * *', // 3 AM daily
  },
  execute: async (context) => {
    context.log('info', 'Starting memory consolidation');
    context.emit('progress', { stage: 'summarize', message: 'Summarizing recent activity...' });
    return withBrain(context, 'memory consolidation', async (b) => {
      const consolidated = await b.consolidateMemory();
      context.emit('progress', { stage: 'prune', message: 'Pruning old memories...' });
      const pruned = await b.pruneMemory({ maxAge: 30 * 24 * 60 * 60 * 1000 });
      return { consolidated, pruned };
    });
  },
};

// System Health Monitor Process
export const healthMonitorProcess: ProcessDefinition = {
  name: 'System Health Monitor',
  type: 'system',
  priority: 'low',
  description:
    'Monitors system health: process count, memory usage, error rates, performance metrics',
  tags: ['monitoring', 'health', 'system'],
  schedule: {
    type: 'interval',
    value: 30 * 1000, // Every 30 seconds
  },
  execute: async (context) => {
    // Read through the injected view, never the singleton, so the task is
    // decoupled from module state and testable against any manager.
    const stats = context.system.stats();
    const processes = context.system.list({ status: 'running' });

    context.emit('progress', { stage: 'check', message: 'Checking system health...' });

    const issues: string[] = [];
    if (stats.total > 200) issues.push(`High process count: ${stats.total}`);
    if (stats.totalMemory > 1024 * 1024 * 1024) {
      issues.push(`High memory usage: ${(stats.totalMemory / 1024 / 1024).toFixed(1)}MB`);
    }
    if (processes.some((p) => p.resources.cpuPercent > 80)) issues.push('High CPU process detected');

    context.emit('health', { stats, issues, timestamp: Date.now() });

    if (issues.length > 0) context.log('warn', `Health issues: ${issues.join(', ')}`);
    else context.log('debug', 'System health OK');

    return {
      success: true,
      exitCode: 0,
      output: { stats, issues, healthy: issues.length === 0 },
      durationMs: 0,
    };
  },
};

// Scheduled Backup Process
export const backupProcess: ProcessDefinition = {
  name: 'Scheduled Backup',
  type: 'scheduled',
  priority: 'low',
  description: 'Creates periodic backups of workspace data and AI memory',
  tags: ['backup', 'scheduled', 'data'],
  schedule: {
    type: 'cron',
    value: '0 2 * * *', // 2 AM daily
  },
  execute: (context) => {
    context.log('info', 'Starting scheduled backup');
    context.emit('progress', { stage: 'backup', message: 'Backing up workspace data...' });
    return withBrain(context, 'scheduled backup', async (b) => ({
      memoryBackup: (await b.exportMemory()) != null,
      timestamp: Date.now(),
    }));
  },
};

/** Long-lived host services the desktop depends on. */
export function createHostServiceProcess(
  name: string,
  description: string,
  heartbeatMs: number,
): ProcessDefinition {
  return {
    name,
    type: 'system',
    priority: 'high',
    description,
    tags: ['system', 'service'],
    execute: (context) =>
      new Promise<ProcessResult>((resolve) => {
        let beats = 0;
        const timer = setInterval(() => {
          beats += 1;
          context.updateResources({ cpuTimeMs: beats * heartbeatMs });
          context.emit('heartbeat', { beats });
          if (context.signal.aborted) {
            clearInterval(timer);
            resolve({
              success: false,
              exitCode: 143,
              error: 'Service stopped',
              durationMs: 0,
            });
          }
        }, heartbeatMs);

        const stop = () => {
          clearInterval(timer);
          context.log('info', `${name} stopped after ${beats} heartbeats`);
        };
        context.signal.addEventListener('abort', stop, { once: true });
      }),
  };
}

export const windowServerProcess = createHostServiceProcess(
  'Window Server',
  'Composites windows, manages z-order, focus and damage regions',
  1000,
);

export const inputServerProcess = createHostServiceProcess(
  'Input Server',
  'Routes keyboard, pointer and shortcut events to the focused client',
  500,
);

export const fsServiceProcess = createHostServiceProcess(
  'File System Service',
  'Owns the virtual filesystem: namespace, persistence and quotas',
  2000,
);

// User Task Process (for running user-defined tasks)
export function createUserTaskProcess(
  name: string,
  fn: (context: ProcessContext) => Promise<ProcessResult>,
): ProcessDefinition {
  return {
    name,
    type: 'user',
    priority: 'normal',
    description: `User task: ${name}`,
    tags: ['user', 'task'],
    execute: fn,
  };
}

/** All built-in processes registry, keyed by launch id. */
export const builtinProcesses: Record<string, ProcessDefinition> = {
  'ai:coding-loop': aiCodingLoopProcess,
  'ai:animation-loop': aiAnimationLoopProcess,
  'system:codebase-index': codebaseIndexProcess,
  'system:memory-consolidation': memoryConsolidationProcess,
  'system:health-monitor': healthMonitorProcess,
  'system:window-server': windowServerProcess,
  'system:input-server': inputServerProcess,
  'system:fs-service': fsServiceProcess,
  'scheduled:backup': backupProcess,
};

/** Ids of processes that only make sense with a brain bridge attached. */
export const brainBackedIds = [
  'ai:coding-loop',
  'ai:animation-loop',
  'system:codebase-index',
  'system:memory-consolidation',
  'scheduled:backup',
] as const;

/**
 * Register the built-ins that belong in a running system. Scheduled entries are
 * registered but not started — the manager's scheduler fires them.
 */
export function registerBuiltinProcesses(pm: {
  create(definition: ProcessDefinition, args?: Record<string, unknown>, parentPid?: number): unknown;
}): ProcessDefinition[] {
  const registered: ProcessDefinition[] = [];
  for (const [id, def] of Object.entries(builtinProcesses)) {
    if (brainBackedIds.includes(id as (typeof brainBackedIds)[number]) && !hasBrainBridge()) continue;
    try {
      pm.create(def);
      registered.push(def);
    } catch (error) {
      console.error(`[ProcessManager] Failed to register ${id}:`, error);
    }
  }
  return registered;
}

export type { ProcessPriority, ProcessType };