// Spec: brain/core/orchestrator.ts — connects EVERYTHING through the central Brain.
//                    ┌──────────────┐
//                    │     BRAIN    │
//                    └──────┬───────┘
//         PERCEPTION ── COGNITION ── MEMORY ── CODING ── ANIMATION ── EVALUATION
import { Brain } from "./brain/Brain";
import { AnimationBrain } from "../animation/api/brain";
import { runBrainLoop } from "./brain-loop";
import { runAnimationLoop } from "../loops/animation-loop/loop";
import type { TaskState } from "./task-state";

export type Capability = "coding" | "animation" | "general";

/** Animation goal-snapshot returned when no task loop is needed. */
export interface AnimationUnderstanding {
  capability: "animation";
  understanding: unknown;
}

/** Task-loop result for coding/general goals. */
export interface CapabilityTask {
  capability: Exclude<Capability, "animation"> | "animation";
  task: TaskState;
}

export type OrchestratorResult = AnimationUnderstanding | CapabilityTask;

export function routeCapability(goal: string): Capability {
  const g = goal.toLowerCase();
  if (/animat|motion|easing|keyframe|timeline|gsap|framer|transition|scroll-trigger|adl/.test(g)) return "animation";
  if (/code|bug|refactor|test|review|implement|function|class|api|endpoint|component/.test(g)) return "coding";
  return "general";
}

export class BrainOrchestrator {
  constructor(
    readonly brain: Brain = new Brain(),
    readonly animation: AnimationBrain = new AnimationBrain(),
  ) {}

  // Shared services (same instances for coding + animation).
  get memory() { return this.brain.memory; }
  get tools() { return this.brain.tools; }
  get gateway() { return this.brain.gateway; }
  get security() { return this.brain.security; }
  get obs() { return this.brain.obs; }

  async run(goal: string): Promise<OrchestratorResult> {
    if (!goal.trim()) throw new Error("goal must be a non-empty string");
    const cap = routeCapability(goal);
    try {
      if (cap === "animation" && /understand|analy[sz]e|describe|what.*happen/.test(goal.toLowerCase())) {
        return { capability: "animation", understanding: this.animation.analyze(goal) };
      }
      if (cap === "animation" && /recreat|reconstruct|reproduc|improve.*anim/.test(goal.toLowerCase())) {
        const r = await runAnimationLoop(this.animation, goal);
        return { capability: "animation", understanding: r };
      }
      const task = await runBrainLoop(this.brain, goal);
      return { capability: cap, task };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.brain.obs.log("error", "error", { where: "orchestrator.run", message });
      throw e;
    }
  }
}

let singleton: BrainOrchestrator | null = null;
export function getOrchestrator(): BrainOrchestrator {
  if (!singleton) singleton = new BrainOrchestrator();
  return singleton;
}
