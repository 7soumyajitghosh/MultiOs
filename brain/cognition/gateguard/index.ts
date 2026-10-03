// brain/cognition/gateguard/index.ts — fact-forcing gate before first write.
// Inspired by affaan-m/ECC GateGuard: deny the first Edit/Write per file,
// demand facts, then allow the retry. Evidence beats self-evaluation.
// Original implementation: per-file gate producing a fact checklist.
export type WriteKind = "edit" | "write" | "destructive-bash";

export interface FactChecklist {
  kind: WriteKind;
  target: string;
  demands: string[];
  allowed: boolean;
  reason: string;
}

const seen = new Set<string>();

/**
 * First-write gate per target. The first attempt is denied with a demand
 * list; once facts are supplied (recordFacts), the retry is allowed.
 * Destructive bash demands victims + rollback every time.
 */
export function gateWrite(kind: WriteKind, target: string): FactChecklist {
  const key = `${kind}:${target}`;
  if (kind === "destructive-bash") {
    return {
      kind, target, allowed: false,
      demands: ["list every victim (files/branches/data)", "one-line rollback plan", "quote the instruction verbatim"],
      reason: "Destructive commands always demand victims + rollback.",
    };
  }
  if (seen.has(key)) return { kind, target, allowed: true, demands: [], reason: "Facts already recorded for this target." };
  const demands =
    kind === "edit"
      ? ["list all importers of the touched symbols", "public functions affected", "quote the instruction verbatim"]
      : ["who will call this", "prove no duplicate exists in the codebase"];
  return { kind, target, allowed: false, demands, reason: "First write per target demands facts before code." };
}

/** Record that facts were supplied; the next gateWrite for this target allows. */
export function recordFacts(kind: WriteKind, target: string): void {
  seen.add(`${kind}:${target}`);
}

/** Reset gate state (tests only). */
export function __resetGateForTests(): void {
  seen.clear();
}
