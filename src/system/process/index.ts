/**
 * Process System - Main Entry Point
 * Exports all process management functionality
 */

export * from './ProcessTypes';
export * from './ProcessManager';

// Re-export commonly used types
export type {
  ProcessInstance,
  ProcessDefinition,
  ProcessContext,
  ProcessResult,
  ProcessStatus,
  ProcessPriority,
  ProcessType,
  ProcessSchedule,
  ProcessResourceUsage,
  ProcessFilter,
  ProcessEvent,
  ProcessEventType,
  ProcessManagerConfig,
} from './ProcessTypes';

export { ProcessManager, getProcessManager, createProcessManager } from './ProcessManager';