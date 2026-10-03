/**
 * Process Manager
 * Handles process lifecycle, scheduling, resource monitoring, and inter-process communication
 */

import type {
  ProcessDefinition,
  ProcessInstance,
  ProcessStatus,
  ProcessPriority,
  ProcessType,
  ProcessContext,
  ProcessResourceUsage,
  ProcessManagerConfig,
  ProcessEvent,
  ProcessEventType,
  ProcessFilter,
  ProcessStats,
} from './ProcessTypes';

// Minimal browser-safe event emitter (avoids node 'events' dependency in the web app)
class Emitter {
  private handlers = new Map<string, Set<(...args: any[]) => void>>();
  on(event: string, fn: (...args: any[]) => void): this {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(fn);
    return this;
  }
  emit(event: string, ...args: any[]): boolean {
    const set = this.handlers.get(event);
    if (!set) return false;
    for (const fn of set) fn(...args);
    return true;
  }
  off(event: string, fn: (...args: any[]) => void): this {
    this.handlers.get(event)?.delete(fn);
    return this;
  }
  removeAllListeners(event?: string): this {
    if (event === undefined) this.handlers.clear();
    else this.handlers.delete(event);
    return this;
  }
  setMaxListeners(_n: number): void { /* no-op for browser */ }
}

export interface ProcessTreeNode extends Omit<ProcessInstance, 'children'> {
  children: ProcessTreeNode[];
}

// Default configuration
const DEFAULT_CONFIG: ProcessManagerConfig = {
  maxProcesses: 256,
  defaultPriority: 'normal',
  defaultMemoryLimit: 512 * 1024 * 1024, // 512MB
  defaultCpuTimeLimit: 60 * 60 * 1000,    // 1 hour
  maxBufferLines: 1000,
  schedulerInterval: 1000,                 // 1 second
  monitorInterval: 2000,                   // 2 seconds
};

// Simple cron parser for basic expressions (minute hour day month weekday)
// Supports: * */n specific values, ranges, lists
function parseCronExpression(expr: string, now: number): number {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Invalid cron expression: ${expr}`);
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const date = new Date(now);
  date.setSeconds(0, 0);
  
  // Find next matching time (simplified - checks next 7 days)
  for (let i = 0; i < 7 * 24 * 60; i++) {
    const m = date.getMinutes();
    const h = date.getHours();
    const dom = date.getDate();
    const mon = date.getMonth() + 1;
    const dow = date.getDay();
    
    const match = 
      matchCronField(minute, m) &&
      matchCronField(hour, h) &&
      matchCronField(dayOfMonth, dom) &&
      matchCronField(month, mon) &&
      matchCronField(dayOfWeek, dow);
    
    if (match && date.getTime() > now) {
      return date.getTime();
    }
    date.setMinutes(date.getMinutes() + 1);
  }
  return now + 24 * 60 * 60 * 1000; // fallback: tomorrow
}

function matchCronField(field: string, value: number): boolean {
  if (field === '*') return true;
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    return value % step === 0;
  }
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number);
    return value >= start && value <= end;
  }
  if (field.includes(',')) {
    return field.split(',').map(Number).includes(value);
  }
  return parseInt(field, 10) === value;
}

// Generate unique PID
let pidCounter = 1;
function generatePid(): number {
  return pidCounter++;
}

export class ProcessManager extends Emitter {
  private processes = new Map<number, ProcessInstance>();
  private config: ProcessManagerConfig;
  private schedulerTimer?: ReturnType<typeof setInterval>;
  private monitorTimer?: ReturnType<typeof setInterval>;
  private running = false;
  /** Live abort handles for tasks currently executing, so kill() can interrupt them. */
  private abortHandles = new Map<number, AbortController>();
  private createdAt: number;
  
  constructor(config: Partial<ProcessManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.createdAt = Date.now();
    this.setMaxListeners(100);
  }

  // Start the process manager (scheduler + monitor)
  start(): void {
    if (this.running) return;
    this.running = true;
    
    this.schedulerTimer = setInterval(() => this.tickScheduler(), this.config.schedulerInterval);
    this.monitorTimer = setInterval(() => this.tickMonitor(), this.config.monitorInterval);
    
    this.emit('manager:started', { timestamp: Date.now() });
  }

  // Stop the process manager
  stop(): void {
    if (!this.running) return;
    this.running = false;
    
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    if (this.monitorTimer) clearInterval(this.monitorTimer);
    
    this.emit('manager:stopped', { timestamp: Date.now() });
  }

  // Create a new process from definition
  create(definition: ProcessDefinition, args: Record<string, unknown> = {}, parentPid?: number): ProcessInstance {
    if (this.processes.size >= this.config.maxProcesses) {
      throw new Error(`Process limit reached (${this.config.maxProcesses})`);
    }

    const pid = generatePid();
    const now = Date.now();
    
    const instance: ProcessInstance = {
      pid,
      definition: {
        ...definition,
        priority: definition.priority ?? this.config.defaultPriority,
        memoryLimit: definition.memoryLimit ?? this.config.defaultMemoryLimit,
        cpuTimeLimit: definition.cpuTimeLimit ?? this.config.defaultCpuTimeLimit,
      },
      status: 'created',
      priority: definition.priority ?? this.config.defaultPriority,
      resources: {
        cpuPercent: 0,
        memoryBytes: 0,
        startTime: now,
        cpuTimeMs: 0,
      },
      schedule: definition.schedule ? {
        ...definition.schedule,
        nextRun: definition.schedule.type === 'once' 
          ? (definition.schedule.value as number)
          : definition.schedule.type === 'interval'
            ? now + (definition.schedule.value as number)
            : parseCronExpression(definition.schedule.value as string, now),
        runCount: 0,
      } : undefined,
      args,
      ppid: parentPid,
      children: [],
      createdAt: now,
      updatedAt: now,
      stdout: [],
      stderr: [],
      maxBufferLines: this.config.maxBufferLines,
    };

    this.processes.set(pid, instance);
    if (parentPid !== undefined) {
      this.processes.get(parentPid)?.children.push(pid);
    }
    this.emitEvent('process:created', pid, { definition: instance.definition });
    
    // Auto-start if no schedule
    if (!instance.schedule) {
      void this.startProcess(pid);
    } else {
      this.emitEvent('schedule:added', pid, { schedule: instance.schedule });
    }

    return instance;
  }

  // Start a created process
  async startProcess(pid: number): Promise<ProcessInstance> {
    const process = this.processes.get(pid);
    if (!process) throw new Error(`Process ${pid} not found`);
    if (process.status !== 'created') throw new Error(`Process ${pid} not in created state`);

    process.status = 'running';
    process.resources.startTime = Date.now();
    process.updatedAt = Date.now();
    this.emitEvent('process:started', pid);

    // Create abort controller for cancellation
    const abortController = new AbortController();
    this.abortHandles.set(pid, abortController);
    
    // Build execution context
    const context: ProcessContext = {
      pid: process.pid,
      name: process.definition.name,
      type: process.definition.type,
      args: process.args,
      env: { ...process.definition.env },
      cwd: process.definition.cwd ?? '/',
      signal: abortController.signal,
      emit: (event, data) => this.emitEvent(`process:${event}` as ProcessEventType, pid, data),
      log: (level, message, meta) => this.appendOutput(pid, level === 'error' ? 'stderr' : 'stdout', `[${level}] ${message}`, meta),
      updateResources: (usage) => this.updateResources(pid, usage),
      shouldYield: () => false, // Could implement cooperative yielding
      system: {
        stats: () => this.getStats(),
        list: (f) => this.listProcesses(f),
      },
    };

    try {
      const startTime = Date.now();
      const result = await process.definition.execute(context);
      const durationMs = Date.now() - startTime;
      
      if (abortController.signal.aborted) {
        process.status = 'killed';
        process.result = {
          success: false,
          exitCode: 137, // SIGKILL
          error: 'Process killed',
          durationMs,
        };
        this.emitEvent('process:killed', pid, { result: process.result });
      } else if (result.success) {
        process.status = 'completed';
        process.result = { ...result, durationMs };
        this.emitEvent('process:completed', pid, { result: process.result });
      } else {
        process.status = 'failed';
        process.result = { ...result, durationMs };
        this.emitEvent('process:failed', pid, { result: process.result, error: result.error });
      }
    } catch (error) {
      process.status = abortController.signal.aborted ? 'killed' : 'failed';
      process.result = {
        success: false,
        exitCode: abortController.signal.aborted ? 137 : 1,
        error: abortController.signal.aborted
          ? 'Process killed'
          : error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - process.resources.startTime,
      };
      this.emitEvent(abortController.signal.aborted ? 'process:killed' : 'process:failed', pid, {
        result: process.result,
        error: process.result.error,
      });
    }

    this.abortHandles.delete(pid);

    // Run cleanup if defined
    if (process.definition.cleanup) {
      try {
        await process.definition.cleanup(context);
      } catch (cleanupError) {
        this.appendOutput(pid, 'stderr', `[warn] Cleanup failed: ${cleanupError}`);
      }
    }

    process.updatedAt = Date.now();
    
    // Handle scheduled re-run
    if (process.schedule && process.status !== 'killed') {
      this.scheduleNextRun(process);
    }
    // Process fully done — kept in memory for inspection

    return process;
  }

  // Pause a running process (cooperative)
  pauseProcess(pid: number): ProcessInstance {
    const process = this.processes.get(pid);
    if (!process) throw new Error(`Process ${pid} not found`);
    if (process.status !== 'running') throw new Error(`Process ${pid} not running`);

    process.status = 'paused';
    process.updatedAt = Date.now();
    this.emitEvent('process:paused', pid);
    return process;
  }

  // Resume a paused process
  resumeProcess(pid: number): ProcessInstance {
    const process = this.processes.get(pid);
    if (!process) throw new Error(`Process ${pid} not found`);
    if (process.status !== 'paused') throw new Error(`Process ${pid} not paused`);

    process.status = 'running';
    process.updatedAt = Date.now();
    this.emitEvent('process:resumed', pid);
    return process;
  }

  // Kill a process forcefully
  killProcess(pid: number, signal = 'SIGKILL'): ProcessInstance {
    const process = this.processes.get(pid);
    if (!process) throw new Error(`Process ${pid} not found`);
    if (process.status === 'completed' || process.status === 'failed' || process.status === 'killed') {
      throw new Error(`Process ${pid} already terminated`);
    }

    // Interrupt the in-flight task first so it stops doing work, then record
    // the terminal state. A task that ignores the signal will observe
    // `status === 'killed'` once its await settles and will not overwrite it.
    this.abortHandles.get(pid)?.abort();
    this.abortHandles.delete(pid);

    process.status = 'killed';
    process.updatedAt = Date.now();
    process.result = {
      success: false,
      exitCode: signal === 'SIGKILL' ? 137 : 143, // SIGKILL=137, SIGTERM=143
      error: `Process killed with ${signal}`,
      durationMs: Date.now() - process.resources.startTime,
    };
    
    this.emitEvent('process:killed', pid, { signal, result: process.result });
    
    // Kill children recursively
    for (const childPid of [...process.children]) {
      const child = this.processes.get(childPid);
      if (child && ['completed', 'failed', 'killed'].includes(child.status)) continue;
      try {
        this.killProcess(childPid, signal);
      } catch {
        /* child already gone */
      }
    }

    return process;
  }

  // Get process by PID
  getProcess(pid: number): ProcessInstance | undefined {
    return this.processes.get(pid);
  }

  // List processes with filtering
  listProcesses(filter: ProcessFilter = {}): ProcessInstance[] {
    let results = Array.from(this.processes.values());

    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      results = results.filter(p => statuses.includes(p.status));
    }
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      results = results.filter(p => types.includes(p.definition.type));
    }
    if (filter.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      results = results.filter(p => priorities.includes(p.priority));
    }
    if (filter.namePattern) {
      const pattern = filter.namePattern.toLowerCase();
      results = results.filter(p => p.definition.name.toLowerCase().includes(pattern));
    }
    if (filter.tag) {
      results = results.filter(p => p.definition.tags?.includes(filter.tag!));
    }
    if (filter.parentPid !== undefined) {
      results = results.filter(p => p.ppid === filter.parentPid);
    }
    if (filter.since) {
      results = results.filter(p => p.createdAt >= filter.since!);
    }

    // Sort by priority (high first), then by creation time
    const priorityOrder: Record<ProcessPriority, number> = { realtime: 5, high: 4, normal: 3, low: 2, idle: 1 };
    results.sort((a, b) => 
      priorityOrder[b.priority] - priorityOrder[a.priority] || a.createdAt - b.createdAt
    );

    if (filter.offset) results = results.slice(filter.offset);
    if (filter.limit) results = results.slice(0, filter.limit);

    return results;
  }

  // Get process tree (parent -> children)
  getProcessTree(pid?: number): ProcessTreeNode[] {
    const roots = pid
      ? [this.processes.get(pid)].filter(Boolean) as ProcessInstance[]
      : Array.from(this.processes.values()).filter(p => !p.ppid);

    const buildTree = (processes: ProcessInstance[]): ProcessTreeNode[] => {
      return processes.map(p => ({
        ...p,
        children: buildTree(p.children.map(cpid => this.processes.get(cpid)!).filter(Boolean) as ProcessInstance[]),
      }));
    };

    return buildTree(roots);
  }

  // Get system stats
  getStats(): ProcessStats {
    const processes = Array.from(this.processes.values());
    const byStatus: Record<ProcessStatus, number> = {
      created: 0, running: 0, paused: 0, waiting: 0, completed: 0, failed: 0, killed: 0,
    };
    const byType: Record<ProcessType, number> = {
      system: 0, user: 0, 'ai-agent': 0, background: 0, scheduled: 0,
    };
    
    let totalMemory = 0;
    let totalCpuTime = 0;

    for (const p of processes) {
      byStatus[p.status]++;
      byType[p.definition.type]++;
      totalMemory += p.resources.memoryBytes;
      totalCpuTime += p.resources.cpuTimeMs;
    }

    return {
      total: processes.length,
      byStatus,
      byType,
      totalMemory,
      totalCpuTime,
      uptime: Date.now() - this.createdAt,
    };
  }

  /** Terminate every live process. Used on shutdown and when the OS reboots. */
  shutdown(): void {
    this.stop();
    for (const pid of [...this.processes.keys()]) {
      const p = this.processes.get(pid);
      if (!p || ['completed', 'failed', 'killed'].includes(p.status)) continue;
      try {
        this.killProcess(pid, 'SIGTERM');
      } catch {
        /* already terminated */
      }
    }
    this.processes.clear();
    this.abortHandles.clear();
    this.emit('manager:shutdown', { timestamp: Date.now() });
  }

  // Clean up completed/failed/killed processes older than maxAge
  cleanup(maxAgeMs = 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [pid, process] of this.processes) {
      if (['completed', 'failed', 'killed'].includes(process.status) && 
          process.updatedAt && now - process.updatedAt > maxAgeMs) {
        this.processes.delete(pid);
        cleaned++;
      }
    }
    return cleaned;
  }

  // Run a scheduled process immediately, as a one-off child.
  //
  // `create()` deliberately does not auto-start a scheduled definition, so a UI
  // that wants to run one "now" must go through here rather than create()ing it
  // (which would just sit in 'created' until its next cron/interval firing).
  triggerNow(pid: number): ProcessInstance {
    const parent = this.processes.get(pid);
    if (!parent) throw new Error(`Process ${pid} not found`);
    if (!parent.definition.schedule) {
      // Not scheduled: just start it if it has not begun yet.
      if (parent.status === 'created') void this.startProcess(pid);
      return parent;
    }

    const { schedule: _ignored, ...childDefinition } = parent.definition;
    return this.create(
      childDefinition,
      { ...parent.args, _scheduledRun: (parent.schedule?.runCount ?? 0) + 1 },
      parent.pid,
    );
  }

  // Private: scheduler tick - check scheduled processes
  private tickScheduler(): void {
    const now = Date.now();
    
    for (const process of this.processes.values()) {
      if (!process.schedule) continue;
      if (process.status === 'running') continue; // Don't start if already running
      if (process.schedule.maxRuns && (process.schedule.runCount ?? 0) >= process.schedule.maxRuns) continue;
      
      if (process.schedule.nextRun && now >= process.schedule.nextRun) {
        const runNumber = (process.schedule.runCount ?? 0) + 1;
        this.emitEvent('schedule:triggered', process.pid, { schedule: process.schedule, run: runNumber });

        // The triggered run is a one-off child: strip the schedule from its
        // definition so it does not itself become a recurring scheduler entry.
        const { schedule: _ignored, ...childDefinition } = process.definition;
        this.create(childDefinition, { ...process.args, _scheduledRun: runNumber }, process.pid);

        // Advance the parent schedule *before* yielding to the next process,
        // otherwise every tick would fire another run of an overdue schedule.
        this.scheduleNextRun(process);
      }
    }
  }

  // Private: monitor tick - update resource usage
  private tickMonitor(): void {
    for (const process of this.processes.values()) {
      if (process.status !== 'running') continue;

      // Simulate resource usage (in real implementation, would measure actual usage)
      const simulatedCpu = Math.min(100, Math.random() * 30 + 5); // 5-35%
      // Deliberately NOT clamped to the limit: the sample has to be able to
      // overshoot for the limit check below to ever fire. Clamping here made
      // the enforcement unreachable.
      const simulatedMemory = process.resources.memoryBytes + Math.random() * 1024 * 1024;
      
      process.resources.cpuPercent = simulatedCpu;
      process.resources.memoryBytes = simulatedMemory;
      process.resources.cpuTimeMs += this.config.monitorInterval * (simulatedCpu / 100);
      process.updatedAt = Date.now();
      
      this.emitEvent('process:resource', process.pid, { resources: process.resources });
      
      // Check limits
      if (process.resources.memoryBytes > (process.definition.memoryLimit ?? this.config.defaultMemoryLimit)) {
        this.killProcess(process.pid, 'SIGKILL');
        this.appendOutput(process.pid, 'stderr', '[error] Memory limit exceeded');
      }
      if (process.resources.cpuTimeMs > (process.definition.cpuTimeLimit ?? this.config.defaultCpuTimeLimit)) {
        this.killProcess(process.pid, 'SIGKILL');
        this.appendOutput(process.pid, 'stderr', '[error] CPU time limit exceeded');
      }
    }
  }

  // Schedule next run for a recurring process
  private scheduleNextRun(process: ProcessInstance): void {
    if (!process.schedule) return;
    
    const now = Date.now();
    let nextRun: number;
    
    switch (process.schedule.type) {
      case 'once':
        // Consumed. Park it in the far future so the scheduler stops firing it
        // — leaving nextRun in the past would re-trigger every single tick.
        nextRun = Number.POSITIVE_INFINITY;
        break;
      case 'interval':
        nextRun = now + (process.schedule.value as number);
        break;
      case 'cron':
        nextRun = parseCronExpression(process.schedule.value as string, now);
        break;
      default:
        return;
    }
    
    process.schedule.nextRun = nextRun;
    process.schedule.runCount = (process.schedule.runCount ?? 0) + 1;
    this.emitEvent('schedule:added', process.pid, { schedule: process.schedule });
  }

  // Append output to process buffers
  private appendOutput(pid: number, stream: 'stdout' | 'stderr', message: string, meta?: Record<string, unknown>): void {
    const process = this.processes.get(pid);
    if (!process) return;
    
    const line = `${new Date().toISOString()} ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}`;
    const buffer = stream === 'stdout' ? process.stdout : process.stderr;
    buffer.push(line);
    
    // Trim buffer
    if (buffer.length > process.maxBufferLines) {
      buffer.shift();
    }
    
    this.emitEvent('process:output', pid, { stream, line });
  }

  // Update process resources
  private updateResources(pid: number, usage: Partial<ProcessResourceUsage>): void {
    const process = this.processes.get(pid);
    if (!process) return;
    
    process.resources = { ...process.resources, ...usage };
    process.updatedAt = Date.now();
    this.emitEvent('process:resource', pid, { resources: process.resources });
  }

  // Emit typed event
  private emitEvent(type: ProcessEventType, pid: number, data?: unknown): void {
    const event: ProcessEvent = { type, pid, timestamp: Date.now(), data };
    this.emit('processEvent', event);
    this.emit(type, event);
  }
}

// Singleton instance
let processManagerInstance: ProcessManager | null = null;

export function getProcessManager(config?: Partial<ProcessManagerConfig>): ProcessManager {
  if (!processManagerInstance) {
    processManagerInstance = new ProcessManager(config);
  }
  return processManagerInstance;
}

export function createProcessManager(config?: Partial<ProcessManagerConfig>): ProcessManager {
  return new ProcessManager(config);
}