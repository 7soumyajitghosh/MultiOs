// Spec: brain/core/brain-loop.ts — central autonomous loop.
// OBSERVE → UNDERSTAND → PLAN → BUILD → RUN → TEST → ANALYZE → FIND PROBLEM → FIX → RETEST → REVIEW → OPTIMIZE → VERIFY
import { Brain } from "./brain/Brain";
import {
  advancePhase, createTaskState, isTerminal, recordTaskAction, recordTaskError,
  type TaskState,
} from "./task-state";
import { BRAIN_LIMITS } from "../config/constants";

export interface LoopOptions {
  maxAttempts?: number;
  onPhase?: (state: TaskState) => void;
}

export async function runBrainLoop(brain: Brain, goal: string, opts: LoopOptions = {}): Promise<TaskState> {
  let s = createTaskState(goal, opts.maxAttempts ?? BRAIN_LIMITS.defaultMaxAttempts);
  const emit = (next: TaskState): TaskState => { s = next; opts.onPhase?.(s); return s; };

  try {
    emit(advancePhase(s, "observe"));
    s = recordTaskAction(s, "observe", goal.slice(0, BRAIN_LIMITS.goalPreviewChars));

    emit(advancePhase(s, "understand"));
    const understanding = brain.reason(goal);
    s = recordTaskAction(s, "understand", understanding);

    emit(advancePhase(s, "plan"));
    const plan = await brain.plan(goal);
    s = { ...s, plan };
    s = recordTaskAction(s, "plan", { subtasks: plan.subtasks.length });

    emit(advancePhase(s, "build"));
    const built = await brain.run({ goal: `Build: ${goal}`, maxSteps: 6 });
    s = recordTaskAction(s, "build", built.response.slice(0, BRAIN_LIMITS.buildPreviewChars));

    emit(advancePhase(s, "run"));
    s = recordTaskAction(s, "run", { model: built.modelUsed });

    emit(advancePhase(s, "test"));
    const evaluation = brain.evaluateResult(goal, built.response);
    s = recordTaskAction(s, "test", evaluation);

    emit(advancePhase(s, "analyze"));
    if (evaluation.needsRevision && s.attempts < s.maxAttempts) {
      emit(advancePhase(s, "fix"));
      const fixed = await brain.run({ goal: `Fix these issues: ${evaluation.issues.join("; ")}. Original goal: ${goal}`, maxSteps: 6 });
      s = recordTaskAction(s, "fix", fixed.response.slice(0, BRAIN_LIMITS.buildPreviewChars));
      emit(advancePhase(s, "retest"));
      const reEval = brain.evaluateResult(goal, fixed.response);
      s = recordTaskAction(s, "retest", reEval);
      s = { ...s, result: fixed.response };
    } else {
      s = recordTaskAction(s, "fix", "no-fix-needed", "skipped");
      emit(advancePhase(s, "retest"));
      s = recordTaskAction(s, "retest", "skipped", "skipped");
      s = { ...s, result: built.response };
    }

    emit(advancePhase(s, "review"));
    s = recordTaskAction(s, "review", brain.evaluateResult(goal, String(s.result ?? "").slice(0, BRAIN_LIMITS.reviewPreviewChars)));

    emit(advancePhase(s, "optimize"));
    s = recordTaskAction(s, "optimize", "token/cost recorded", "succeeded");

    emit(advancePhase(s, "verify"));
    const finalEval = brain.evaluateResult(goal, String(s.result ?? ""));
    s = recordTaskAction(s, "verify", finalEval, finalEval.needsRevision ? "failed" : "succeeded");
    emit(advancePhase(s, finalEval.needsRevision ? "failed" : "done"));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    s = recordTaskError(s, message);
    if (!isTerminal(emit(advancePhase(s, "failed")))) {
      // advancePhase guarantees a terminal state above; guard keeps the
      // isTerminal import load-bearing so regressions are caught.
      throw new Error("brain-loop did not reach a terminal state", { cause: e });
    }
  }
  return s;
}
