/**
 * Process/Task Manager Types
 * Core types for process representation, scheduling, and lifecycle management
 */

export type ProcessStatus = 
  | 'created'      // Process created but not started
  | 'running'      // Actively executing
  | 'paused'       // Temporarily suspended
  | 'waiting'      // Waiting for I/O or event
  | 'completed'    // Finished successfully
  | 'failed'       // Ended with error
  | 'killed';      // Forcefully terminated

export type ProcessPriority = 'idle' | 'low' | 'normal' | 'high' | 'realtime';

export type ProcessType = 
  | 'system'       // Core OS processes
  | 'user'         // User-launched applications
  | 'ai-agent'     // AI brain autonomous loops
  | 'background'   // Background tasks (sync, indexing)
  | 'scheduled';   // Cron-like scheduled tasks

export interface ProcessResourceUsage {
  cpuPercent: number;      // Simulated CPU usage (0-100)
  memoryBytes: number;     // Memory usage in bytes
  startTime: number;       // Unix timestamp when process started
  cpuTimeMs: number;       // Total CPU time consumed
}

export interface ProcessSchedule {
  type: 'once' | 'interval' | 'cron';
  // For 'once': timestamp to run
  // For 'interval': milliseconds between runs
  // For 'cron': cron expression string
  value: number | string;
  nextRun?: number;        // Next scheduled run timestamp
  runCount?: number;       // How many times executed
  maxRuns?: number;        // Optional limit
}

export interface ProcessDefinition {
  name: string;
  type: ProcessType;
  priority: ProcessPriority;
  // Main execution function - returns a promise that resolves when done
  execute: (context: ProcessContext) => Promise<ProcessResult>;
  // Optional cleanup on termination
  cleanup?: (context: ProcessContext) => Promise<void>;
  // Schedule for automatic execution
  schedule?: ProcessSchedule;
  // Environment variables
  env?: Record<string, string>;
  // Working directory (virtual FS path)
  cwd?: string;
  // Maximum memory limit (bytes)
  memoryLimit?: number;
  // Maximum CPU time (ms)
  cpuTimeLimit?: number;
  // Tags for grouping/filtering
  tags?: string[];
  // Description for UI
  description?: string;
}

export interface ProcessContext {
  pid: number;
  name: string;
  type: ProcessType;
  args: Record<string, unknown>;
  env: Record<string, string>;
  cwd: string;
  // Signals for cooperative cancellation
  signal: AbortSignal;
  // Emit progress/events to UI
  emit: (event: string, data?: unknown) => void;
  // Log to process output
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
  // Update resource usage (called by process)
  updateResources: (usage: Partial<ProcessResourceUsage>) => void;
  // Check if process should yield (for cooperative multitasking)
  shouldYield: () => boolean;
  // Read-only view of the whole process table
  system: ProcessSystemView;
}

export interface ProcessResult {
  success: boolean;
  exitCode: number;
  output?: unknown;
  error?: string;
  durationMs: number;
}

/** Aggregate view of the process table. */
export interface ProcessStats {
  total: number;
  byStatus: Record<ProcessStatus, number>;
  byType: Record<ProcessType, number>;
  totalMemory: number;
  totalCpuTime: number;
  uptime: number;
}

/**
 * Read-only handle on the process system, handed to every task.
 *
 * Tasks must use this rather than importing the `getProcessManager()` singleton:
 * it keeps them decoupled from module state and makes them testable against an
 * injected manager.
 */
export interface ProcessSystemView {
  stats(): ProcessStats;
  list(filter?: ProcessFilter): ProcessInstance[];
}

export interface ProcessInstance {
  pid: number;
  definition: ProcessDefinition;
  status: ProcessStatus;
  priority: ProcessPriority;
  resources: ProcessResourceUsage;
  schedule?: ProcessSchedule;
  // Process arguments/inputs
  args: Record<string, unknown>;
  // Parent process PID (if spawned)
  ppid?: number;
  // Child PIDs
  children: number[];
  // Exit result (when completed/failed)
  result?: ProcessResult;
  // Creation timestamp
  createdAt: number;
  // Last state change
  updatedAt: number;
  // Standard output/error buffers (limited size)
  stdout: string[];
  stderr: string[];
  // Max buffer lines
  maxBufferLines: number;
}

export interface ProcessManagerConfig {
  maxProcesses: number;
  defaultPriority: ProcessPriority;
  defaultMemoryLimit: number;
  defaultCpuTimeLimit: number;
  maxBufferLines: number;
  // Scheduler tick interval (ms)
  schedulerInterval: number;
  // Resource monitoring interval (ms)
  monitorInterval: number;
}

// Events emitted by process manager
export type ProcessEventType = 
  | 'process:created'
  | 'process:started'
  | 'process:paused'
  | 'process:resumed'
  | 'process:completed'
  | 'process:failed'
  | 'process:killed'
  | 'process:output'      // stdout/stderr
  | 'process:resource'    // resource update
  | 'schedule:triggered'
  | 'schedule:added'
  | 'schedule:removed';

export interface ProcessEvent {
  type: ProcessEventType;
  pid: number;
  timestamp: number;
  data?: unknown;
}

// Filter for listing processes
export interface ProcessFilter {
  status?: ProcessStatus | ProcessStatus[];
  type?: ProcessType | ProcessType[];
  priority?: ProcessPriority | ProcessPriority[];
  namePattern?: string;    // substring match
  tag?: string;            // has tag
  parentPid?: number;      // direct children only
  since?: number;          // created after timestamp
  limit?: number;
  offset?: number;
}