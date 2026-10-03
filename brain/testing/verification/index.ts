// brain/testing/verification/index.ts — completion claim gate.
// Inspired by obra/superpowers verification-before-completion:
// NO completion claims without fresh verification evidence.
// Original implementation: claim table with per-claim evidence requirements.
export type ClaimKind = "tests" | "lint" | "build" | "bugfix" | "regression" | "requirements";

export interface Claim {
  kind: ClaimKind;
  /** Fresh evidence (command output, exit code, diff). Stale or missing = fail. */
  evidence: string;
  passed: boolean;
}

export interface VerificationReport {
  ready: boolean;
  failures: string[];
  summary: string;
}

const EVIDENCE_REQUIRED: Record<ClaimKind, string> = {
  tests: "0 failures in full-suite output",
  lint: "0 errors in linter output",
  build: "exit 0 with no errors",
  bugfix: "original symptom re-run and resolved",
  regression: "RED→GREEN cycle: new test fails on old code, passes on new",
  requirements: "line-by-line checklist against the goal",
};

/**
 * Verify completion claims. Skipping a step is lying, not verifying:
 * any claim without fresh passing evidence blocks READY.
 * Banned language in evidence: should/probably/seems.
 */
export function verifyCompletion(claims: Claim[]): VerificationReport {
  const failures: string[] = [];
  for (const c of claims) {
    if (!c.passed || !c.evidence.trim()) {
      failures.push(`${c.kind}: missing or failing evidence (need: ${EVIDENCE_REQUIRED[c.kind]})`);
      continue;
    }
    if (/\b(should|probably|seems|might work)\b/i.test(c.evidence)) {
      failures.push(`${c.kind}: evidence contains hedging language — re-verify with facts`);
    }
  }
  return {
    ready: failures.length === 0,
    failures,
    summary: failures.length ? `NOT READY: ${failures.length} claim(s) unverified` : "READY: all claims evidenced",
  };
}
