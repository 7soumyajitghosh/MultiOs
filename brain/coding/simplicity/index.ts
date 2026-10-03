// brain/coding/simplicity/index.ts — the YAGNI ladder.
// Inspired by DietrichGebert/ponytail: think like the laziest senior dev.
// Stop at the first rung that holds; never cut validation, security, or accessibility.
// Original implementation: ladder evaluator + over-engineering detector for reviews.
export interface LadderRung {
  rung: number;
  question: string;
  action: string;
}

/** Lowest rung number = laziest acceptable solution. Evaluate top-down, stop at first hold. */
export const SIMPLICITY_LADDER: LadderRung[] = [
  { rung: 1, question: "Does this need to exist?", action: "Skip it (YAGNI). The best code is code never written." },
  { rung: 2, question: "Already in this codebase?", action: "Reuse it. Do not rewrite." },
  { rung: 3, question: "Stdlib does it?", action: "Use stdlib." },
  { rung: 4, question: "Native platform feature?", action: "Use the native feature (e.g. <input type=date>, Intl, fetch)." },
  { rung: 5, question: "Installed dependency does it?", action: "Use the installed dependency. Do not add a new one." },
  { rung: 6, question: "One line?", action: "Write one line." },
  { rung: 7, question: "Otherwise", action: "Write the minimum that works." },
];

/** Never on the chopping block, no matter the rung. */
export const NEVER_CUT = [
  "trust-boundary validation",
  "data-loss handling",
  "security controls",
  "accessibility",
  "error handling on I/O paths",
] as const;

export interface SolutionOption {
  reusesExisting: boolean;
  usesStdlib: boolean;
  usesNativeFeature: boolean;
  usesInstalledDependency: boolean;
  addsNewDependency: boolean;
  linesAdded: number;
}

export interface LadderVerdict {
  rung: number;
  action: string;
  note: string;
}

/** Evaluate a proposed solution against the ladder (first holding rung wins). */
export function evaluateAgainstLadder(opt: SolutionOption): LadderVerdict {
  if (opt.linesAdded <= 0 && !opt.addsNewDependency) {
    return { rung: 1, action: SIMPLICITY_LADDER[0].action, note: "No new code needed." };
  }
  if (opt.reusesExisting) return { rung: 2, action: SIMPLICITY_LADDER[1].action, note: "Reuse existing code." };
  if (opt.usesStdlib) return { rung: 3, action: SIMPLICITY_LADDER[2].action, note: "Prefer stdlib." };
  if (opt.usesNativeFeature) return { rung: 4, action: SIMPLICITY_LADDER[3].action, note: "Prefer the native platform feature." };
  if (opt.usesInstalledDependency && !opt.addsNewDependency) {
    return { rung: 5, action: SIMPLICITY_LADDER[4].action, note: "Use the installed dependency." };
  }
  if (opt.linesAdded <= 3 && !opt.addsNewDependency) {
    return { rung: 6, action: SIMPLICITY_LADDER[5].action, note: "One-liner suffices." };
  }
  const flag = opt.addsNewDependency ? " New dependency requires justification: no native/stdlib/installed option." : "";
  return { rung: 7, action: SIMPLICITY_LADDER[6].action, note: `Minimum viable implementation.${flag}` };
}

export interface OverEngineeringSignals {
  linesAdded: number;
  filesAdded: number;
  newDependencies: number;
  nativeAlternativeExists: boolean;
  reusesExisting: boolean;
}

export interface OverEngineeringReport {
  score: number;
  flags: string[];
  deleteList: string[];
}

/** Score a diff for over-engineering (0 = minimal, 1 = maximal). Produces a delete-list. */
export function detectOverEngineering(s: OverEngineeringSignals): OverEngineeringReport {
  const flags: string[] = [];
  const deleteList: string[] = [];
  let score = 0;
  if (s.nativeAlternativeExists) {
    score += 0.4;
    flags.push("native-platform-alternative-exists");
    deleteList.push("Replace custom implementation with the native platform feature.");
  }
  if (s.newDependencies > 0 && !s.reusesExisting) {
    score += 0.25 * Math.min(s.newDependencies, 2);
    flags.push("new-dependency");
    deleteList.push("Justify each new dependency or remove it.");
  }
  if (s.filesAdded > 3) {
    score += 0.2;
    flags.push("too-many-new-files");
    deleteList.push(`Added ${s.filesAdded} files; consolidate to the smallest set that works.`);
  }
  if (s.linesAdded > 200) {
    score += 0.15;
    flags.push("large-diff");
    deleteList.push(`Added ${s.linesAdded} lines; cut everything not required by the task.`);
  }
  if (!s.reusesExisting && s.linesAdded > 50) {
    score += 0.1;
    flags.push("no-reuse");
    deleteList.push("Check the codebase for existing helpers before adding new ones.");
  }
  return { score: Math.min(1, Math.round(score * 100) / 100), flags, deleteList };
}

// ---- Ponytail review format: tagged one-line findings ----

export type SimplicityTag = "delete" | "stdlib" | "native" | "reuse" | "yagni" | "shrink";

export interface SimplicityFinding {
  tag: SimplicityTag;
  file: string;
  line: number;
  what: string;
  replacement: string;
}

/** Render `path:Lline: tag what. replacement.` — one line per finding. */
export function formatFinding(f: SimplicityFinding): string {
  return `${f.file}:L${f.line}: ${f.tag}: ${f.what}. ${f.replacement}.`;
}

/** Net-lines metric: sum(deleted − replacement) across findings. */
export function netLinesSaved(findings: Array<SimplicityFinding & { linesRemoved: number; linesAdded: number }>): number {
  return findings.reduce((n, f) => n + (f.linesRemoved - f.linesAdded), 0);
}

/** Audit hunt checklist: structural shapes that signal over-engineering. */
export const AUDIT_HUNT = [
  "single-implementation interfaces (inline until a second one exists)",
  "factories with one product",
  "wrappers that only delegate",
  "files exporting one thing",
  "dead flags and config nobody sets",
  "hand-rolled stdlib equivalents",
  "helpers duplicating a repo equivalent",
  "abstractions with a single caller",
] as const;

/**
 * Pre-delete rule: never emit delete: without repo-wide reference check
 * (including tests, fixtures, string/dynamic references).
 */
export function mayDelete(referenceCount: number): boolean {
  return referenceCount === 0;
}
