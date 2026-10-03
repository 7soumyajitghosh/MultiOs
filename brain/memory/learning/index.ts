// brain/memory/learning/index.ts — continuous learning from session outcomes.
// Inspired by affaan-m/ECC (continuous learning: wins become reusable skills;
// save-session summaries) and thedotmack/claude-mem (typed observations,
// progressive-disclosure retrieval: index first, details only on demand).
// Original implementation: lesson extractor + session summarizer + compact index views.
import type { Action, EvaluationResult } from "../../core/types";

export type ObservationKind = "decision" | "bugfix" | "security_alert" | "progress" | "preference";

export interface Lesson {
  kind: ObservationKind;
  title: string;
  detail: string;
  confidence: number;
  source: string;
}

export interface SessionOutcome {
  goal: string;
  taskId: string;
  actions: Action[];
  evaluation: EvaluationResult | null;
  fallbacks: number;
  modelUsed: string;
  durationMs: number;
}

export interface CompactIndexEntry {
  id: string;
  scope: string;
  kind?: ObservationKind;
  preview: string;
  importance: number;
  score?: number;
  createdAt: number;
}

/** Compact a long text into an index preview (~50-100 tokens like claude-mem layer 1). */
export function toPreview(content: string, maxChars = 160): string {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length <= maxChars ? flat : `${flat.slice(0, maxChars)}…`;
}

/**
 * Distill a finished session into durable lessons.
 * Only promotes observations with real evidence (fallbacks, revisions, tool failures).
 */
export function extractLessons(outcome: SessionOutcome): Lesson[] {
  const lessons: Lesson[] = [];
  const failedTools = outcome.actions.filter((a) => a.status === "failed");
  if (outcome.fallbacks > 0) {
    lessons.push({
      kind: "decision",
      title: `Model routing fell back ${outcome.fallbacks}x on: ${toPreview(outcome.goal, 80)}`,
      detail: `Primary model failed; ${outcome.modelUsed} succeeded after ${outcome.fallbacks} fallback(s). Prefer ${outcome.modelUsed} first for similar goals.`,
      confidence: 0.7,
      source: outcome.taskId,
    });
  }
  if (outcome.evaluation?.needsRevision) {
    lessons.push({
      kind: "bugfix",
      title: `First attempt needed revision: ${toPreview(outcome.goal, 80)}`,
      detail: `Issues: ${outcome.evaluation.issues.slice(0, 3).join("; ")}. Next time plan explicitly for: ${outcome.evaluation.suggestedNextAction ?? "verification"}.`,
      confidence: 0.6,
      source: outcome.taskId,
    });
  }
  for (const f of failedTools.slice(0, 3)) {
    lessons.push({
      kind: "bugfix",
      title: `Tool failed: ${f.name}`,
      detail: `Error: ${(f.error ?? "unknown").slice(0, 200)}. Goal was: ${toPreview(outcome.goal, 80)}.`,
      confidence: 0.5,
      source: outcome.taskId,
    });
  }
  if (!lessons.length && outcome.evaluation && !outcome.evaluation.needsRevision) {
    lessons.push({
      kind: "progress",
      title: `Clean run: ${toPreview(outcome.goal, 80)}`,
      detail: `Succeeded first try with ${outcome.modelUsed} in ${outcome.durationMs}ms. This approach works — reuse it.`,
      confidence: 0.5,
      source: outcome.taskId,
    });
  }
  return lessons;
}

/** Render a session summary for future sessions (ECC save-session equivalent). */
export function summarizeSession(outcome: SessionOutcome, lessons: Lesson[] = []): string {  const lines = [
    `# Session ${outcome.taskId}`,
    ``,
    `Goal: ${outcome.goal}`,
    `Model: ${outcome.modelUsed} (fallbacks: ${outcome.fallbacks}) · ${outcome.durationMs}ms`,
    `Actions: ${outcome.actions.length} (${outcome.actions.filter((a) => a.status === "succeeded").length} succeeded, ${outcome.actions.filter((a) => a.status === "failed").length} failed)`,
    outcome.evaluation
      ? `Evaluation: ${outcome.evaluation.needsRevision ? `needs revision — ${outcome.evaluation.issues.join("; ")}` : "accepted"}`
      : `Evaluation: disabled`,
    ``,
  ];
  if (lessons.length) {
    lines.push(`## Lessons`);
    for (const l of lessons) lines.push(`- [${l.kind}] ${l.title}`);
    lines.push(``);
  }
  return lines.join("\n");
}

// ---- Claude-mem observation record (facts + narrative + concepts) ----

export type ObservationType =
  | "bugfix" | "feature" | "refactor" | "change" | "discovery"
  | "decision" | "security_alert" | "security_note" | "sensitive";

/** Closed concept set: bare keywords describing what the observation teaches. */
export type ObservationConcept =
  | "how-it-works" | "why-it-exists" | "what-changed"
  | "problem-solution" | "gotcha" | "pattern" | "trade-off";

export interface ObservationRecord {
  type: ObservationType;
  title: string;
  subtitle: string;
  /** Exactly the durable facts: self-contained, no pronouns, file:fn:value. */
  facts: string[];
  narrative: string;
  concepts: ObservationConcept[];
  filesRead: string[];
  filesModified: string[];
  createdAt: number;
}

/** Noise gate: routine progress with no durable content is skipped, never stored. */
export function shouldSkipObservation(cand: { facts: string[]; narrative: string }): { skip: boolean; reason?: string } {
  if (!cand.facts.length && cand.narrative.trim().length < 80) {
    return { skip: true, reason: "noise: no durable facts" };
  }
  return { skip: false };
}

/** Strip <private> blocks: privacy-tagged content is never stored. */
export function stripPrivate(text: string): string {
  return text.replace(/<private>[\s\S]*?<\/private>/gi, "").trim();
}

const CHARS_PER_TOKEN = 4;

/** Token estimate for an observation (chars/4 over rendered fields). */
export function estimateObservationTokens(o: Pick<ObservationRecord, "title" | "subtitle" | "narrative" | "facts">): number {
  const chars = o.title.length + o.subtitle.length + o.narrative.length + JSON.stringify(o.facts).length;
  return Math.ceil(chars / CHARS_PER_TOKEN);
}

/**
 * Fit observations into a char budget without splitting items:
 * newest summary first, then halve counts until it fits.
 */
export function fitContextBudget<T>(items: T[], render: (t: T) => string, maxChars = 10000): T[] {
  let kept = [...items];
  while (kept.length > 1 && kept.map(render).join("\n").length > maxChars) {
    kept = kept.slice(0, Math.max(1, Math.ceil(kept.length / 2)));
  }
  return kept;
}
