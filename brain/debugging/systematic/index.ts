// brain/debugging/systematic/index.ts — 4-phase systematic debugging.
// Inspired by obra/superpowers systematic-debugging + verification-before-completion:
// reproduce → isolate → fix → verify. No guessing; evidence gates every advance.
// Original implementation: phase state machine with evidence requirements.
export type DebugPhase = "reproduce" | "isolate" | "fix" | "verify" | "done";

export interface DebugEvidence {
  at: number;
  phase: DebugPhase;
  detail: string;
}

export interface DebugAction {
  phase: DebugPhase;
  instruction: string;
  requires: string[];
}

/** Systematic debugging: each phase needs evidence before advancing. */
export class SystematicDebug {
  private phase: DebugPhase = "reproduce";
  private evidence: DebugEvidence[] = [];

  constructor(readonly symptom: string) {}

  current(): DebugPhase {
    return this.phase;
  }

  history(): DebugEvidence[] {
    return [...this.evidence];
  }

  /** Attach evidence for the current phase. */
  observe(detail: string): void {
    this.evidence.push({ at: Date.now(), phase: this.phase, detail });
  }

  /**
   * Single-hypothesis checkpoint (superpowers Phase 3): exactly one
   * "I think X because Y" hypothesis, smallest change, one variable.
   * Tracked so fix attempts stay honest.
   */
  hypothesize(statement: string, because: string): void {
    this.evidence.push({ at: Date.now(), phase: this.phase, detail: `Hypothesis: I think ${statement} because ${because}` });
  }

  /** Breaker: ≥3 failed fix rounds → stop and question the architecture, never attempt fix #4 blindly. */
  fixAttempts(): number {
    return this.evidence.filter((e) => e.phase === "fix").length;
  }

  needsArchitecturalReview(): boolean {
    return this.fixAttempts() >= 3 && this.phase !== "done";
  }

  private hasEvidence(phase: DebugPhase): boolean {
    return this.evidence.some((e) => e.phase === phase);
  }

  /** Advance when the current phase has evidence; otherwise refuse with a reason. */
  advance(): { ok: boolean; reason?: string } {
    const gate: Record<DebugPhase, string> = {
      reproduce: "Reproduce first: record exact repro steps + failing output.",
      isolate: "Isolate first: record the minimal trigger (bisect inputs, narrow the suspect to one unit).",
      fix: "Fix first: record what changed and why it addresses the isolated cause.",
      verify: "Verify first: record the passing repro + regression check.",
      done: "Already done.",
    };
    if (this.phase === "done") return { ok: false, reason: gate.done };
    if (!this.hasEvidence(this.phase)) return { ok: false, reason: gate[this.phase] };
    this.phase = this.phase === "reproduce" ? "isolate" : this.phase === "isolate" ? "fix" : this.phase === "fix" ? "verify" : "done";
    return { ok: true };
  }

  nextAction(): DebugAction {
    switch (this.phase) {
      case "reproduce":
        return { phase: "reproduce", instruction: "Reproduce the bug deterministically. Record exact steps, input, and failing output.", requires: ["repro steps", "failing output"] };
      case "isolate":
        return { phase: "isolate", instruction: "Narrow to the single responsible unit (bisect, minimize input, trace the real flow). Do not fix yet.", requires: ["minimal trigger", "suspect unit"] };
      case "fix":
        return { phase: "fix", instruction: "Apply the smallest fix addressing the isolated cause. Explain why, not just what.", requires: ["root cause", "minimal diff"] };
      case "verify":
        return { phase: "verify", instruction: "Re-run the original repro (must pass) plus adjacent regression checks. Never declare fixed without this.", requires: ["passing repro", "regression check"] };
      case "done":
        return { phase: "done", instruction: "Debugging complete. Summarize cause + fix.", requires: [] };
    }
  }
}
