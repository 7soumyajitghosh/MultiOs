# Aurora Userland — Process System

Describes `src/system/`, the userland side of the OS. It is deliberately kept
separate from `kernel/` (the freestanding x86_64 prototype): the two share a
naming philosophy and an init-sequence shape, but no code.

## Layout

```
src/system/
  kernel.ts               init sequence: boot / shutdown / reboot
  index.ts                 barrel
  process/
    ProcessTypes.ts        process, context, schedule and event types
    ProcessManager.ts      lifecycle, scheduling, resource monitor
    BuiltinProcesses.ts    built-in services and AI agent definitions
    BrainBridge.ts         injectable host capability for AI processes
    index.ts               barrel
```

## Init sequence

`bootKernel()` mirrors the ordering of `kmain()` in `kernel/kernel.c` — bring
subsystems up in dependency order, start the scheduler, then hand control to the
UI. It is idempotent.

| Phase | Trigger |
| --- | --- |
| `cold` | initial state |
| `booting` | `bootKernel()` in progress |
| `running` | scheduler + monitor timers live |
| `halted` | `shutdownKernel()`; all processes terminated |

`App.tsx` calls `bootKernel()` on login, `shutdownKernel()` on logout and power
off, and `rebootKernel()` on restart.

## Process model

A process is a `ProcessDefinition` (immutable recipe) plus a `ProcessInstance`
(live state). Definitions carry a `type`, `priority`, resource limits and an
`execute(ctx)` function; instances own status, buffered stdout/stderr and
resource samples.

Statuses: `created -> running -> completed | failed | killed`, plus `paused`
(cooperative) and `waiting`.

`ProcessContext` gives a task its `signal` (an `AbortSignal`), `emit`, `log`,
`updateResources` and `shouldYield`.

### Scheduling

- `schedulerInterval` (1s) fires due schedules: `once`, `interval` or a
  five-field cron expression.
- A fired schedule spawns a **one-off child** whose definition has the schedule
  stripped, and the parent's `nextRun` is advanced in the same tick. Both details
  matter: without them a triggered run would inherit its own schedule and an
  overdue schedule would re-fire on every tick.
- `monitorInterval` (2s) samples resource usage for running processes and
  enforces the memory and CPU-time limits.

### Termination

`killProcess()` aborts the task's `AbortSignal` first, then records the
terminal state, then kills children depth-first. A task that resolves after
being killed stays `killed` rather than overwriting the status with
`completed`.

## Built-in processes

| Id | Type | Schedule |
| --- | --- | --- |
| `system:window-server` | system | long-lived service |
| `system:input-server` | system | long-lived service |
| `system:fs-service` | system | long-lived service |
| `system:health-monitor` | system | every 30s |
| `system:codebase-index` | background | every 5m |
| `system:memory-consolidation` | system | cron `0 3 * * *` |
| `scheduled:backup` | scheduled | cron `0 2 * * *` |
| `ai:coding-loop` | ai-agent | on demand |
| `ai:animation-loop` | ai-agent | on demand |

## Brain bridge

The AI processes need the `brain/` subsystem, which targets Node and lives
outside the browser bundle. `src/system/` therefore never imports it directly.
The host installs a `BrainBridge` at boot:

```ts
import { bootKernel, setBrainBridge } from './system/kernel';

bootKernel({ brain: myBridge });
```

With no bridge installed the AI processes are simply not registered, and any
that are spawned by hand fail with exit code 78 and a readable message rather
than pulling Node-only modules into the bundle. `Activity Monitor` shows the
state as `AI brain: not installed`.

## Activity Monitor

`src/apps/ActivityMonitorApp.tsx` hosts `src/components/ProcessList.tsx` and
exposes the launchables, the kernel phase and a reap action for terminated
processes. The table subscribes to manager events and a 1s clock tick for the
uptime column; sorting and filtering are client-side.

Note for future edits: status and priority chips use **static** Tailwind class
strings. Tailwind cannot see interpolated class names, so building a class from
a status key at runtime silently produces no styles.

## Tests

Run with `pnpm test`. Scheduler tests use fake timers, so an interval schedule
can be observed across many ticks without waiting in real time.

| File | Covers |
| --- | --- |
| `process/ProcessManager.test.ts` | lifecycle, kill/abort, scheduling, limits, queries, events |
| `process/BuiltinProcesses.test.ts` | brain-bridge decoupling, host services, health monitor |
| `kernel.test.ts` | boot/shutdown/reboot, idempotency, `spawnProcess` |

Writing them surfaced four defects that would otherwise have shipped:

1. The memory-limit check was unreachable — the simulated sample was clamped to
   the very limit it was then compared against.
2. `killProcess` never aborted the task, so a killed process could resurrect
   itself as `completed` when its await settled.
3. `tickScheduler` fired once per tick rather than once per interval, and the
   triggered run inherited its own schedule, multiplying on every pass.
4. A scheduled definition created on demand never ran at all, because `create()`
   intentionally does not auto-start scheduled work. Hence `triggerNow`.