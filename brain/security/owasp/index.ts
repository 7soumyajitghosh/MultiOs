// brain/security/owasp/index.ts — OWASP classification + CVSS-like severity scoring.
// Inspired by usestrix/strix (OWASP Top 10 coverage, CVSS scoring, validated findings).
// Original implementation: category catalog, keyword classifier, 0-10 scorer.
export interface OwaspCategory {
  id: string;
  name: string;
  description: string;
  examples: string[];
}

export const OWASP_TOP_10: OwaspCategory[] = [
  { id: "A01", name: "Broken Access Control", description: "Missing or bypassable authorization checks.", examples: ["IDOR", "privilege escalation", "auth bypass", "missing authorization"] },
  { id: "A02", name: "Cryptographic Failures", description: "Weak or missing crypto protecting sensitive data.", examples: ["plaintext secret", "weak hash", "missing TLS", "hardcoded key"] },
  { id: "A03", name: "Injection", description: "Untrusted input interpreted as code or query.", examples: ["SQL injection", "command injection", "XSS", "SSTI", "LDAP injection"] },
  { id: "A04", name: "Insecure Design", description: "Missing security controls by design.", examples: ["no rate limit", "business logic flaw", "unenforced workflow"] },
  { id: "A05", name: "Security Misconfiguration", description: "Unsafe defaults, verbose errors, open CORS.", examples: ["wildcard CORS", "debug enabled", "default credentials"] },
  { id: "A06", name: "Vulnerable Components", description: "Known-CVE dependencies.", examples: ["outdated dependency", "CVE", "unpatched library"] },
  { id: "A07", name: "Auth Failures", description: "Broken authentication or session management.", examples: ["JWT none", "session fixation", "credential stuffing", "weak password policy"] },
  { id: "A08", name: "Data/Software Integrity Failures", description: "Unverified updates, unsafe deserialization.", examples: ["pickle", "unsigned update", "insecure pipeline"] },
  { id: "A09", name: "Logging/Monitoring Failures", description: "Breaches undetected for lack of telemetry.", examples: ["no audit log", "unmonitored admin action"] },
  { id: "A10", name: "SSRF", description: "Server fetches attacker-chosen URLs.", examples: ["user-controlled URL", "metadata endpoint", "allowlist missing"] },
];

export type SeverityRating = "none" | "low" | "medium" | "high" | "critical";

export interface ScoredFinding {
  title: string;
  categoryId: string;
  score: number;
  rating: SeverityRating;
  detail: string;
}

function ratingFor(score: number): SeverityRating {
  if (score <= 0) return "none";
  if (score < 4) return "low";
  if (score < 7) return "medium";
  if (score < 9) return "high";
  return "critical";
}

/**
 * Simplified CVSS-like score from 0..1 factors.
 * exploitability: how easily triggered; impact: confidentiality/integrity/availability loss;
 * exposure: how reachable (internet-facing = 1, local-only = 0.2).
 */
export function scoreSeverity(exploitability: number, impact: number, exposure = 0.7): { score: number; rating: SeverityRating } {
  const clamp = (n: number): number => Math.min(1, Math.max(0, n));
  const score = Math.round((0.5 * clamp(exploitability) + 0.35 * clamp(impact) + 0.15 * clamp(exposure)) * 100) / 10;
  return { score, rating: ratingFor(score) };
}

/** Keyword classifier mapping free-text findings to OWASP categories. */
export function classifyOwasp(text: string): OwaspCategory[] {
  const t = text.toLowerCase();
  return OWASP_TOP_10.filter((c) =>
    c.name.toLowerCase().split(/[^a-z]+/).some((w) => w.length > 3 && t.includes(w)) ||
    c.examples.some((e) => t.includes(e.toLowerCase())),
  );
}

/** Attach OWASP category + score to raw finding titles; sorted worst-first. */
export function rankFindings(  titles: string[],
  rate: (title: string) => { exploitability: number; impact: number; exposure?: number } = () => ({ exploitability: 0.5, impact: 0.5 }),
): ScoredFinding[] {
  return titles
    .map((title) => {
      const cats = classifyOwasp(title);
      const { score, rating } = scoreSeverity(rate(title).exploitability, rate(title).impact, rate(title).exposure);
      return {
        title,
        categoryId: cats[0]?.id ?? "A04",
        score,
        rating,
        detail: cats[0] ? `${cats[0].id} ${cats[0].name}` : "Unclassified — triage as insecure design until proven otherwise",
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ---- Strix-grade finding discipline ----

/**
 * Specific child CWEs only — never broad parents (CWE-74/20/200/284/693).
 * Maps finding keywords to the most specific CWE.
 */
export const CWE_MAP: Array<{ match: RegExp; cwe: string; label: string }> = [
  { match: /sql/i, cwe: "CWE-89", label: "SQL Injection" },
  { match: /xss|cross-?site/i, cwe: "CWE-79", label: "Cross-site Scripting" },
  { match: /command|os injection|shell/i, cwe: "CWE-78", label: "OS Command Injection" },
  { match: /code injection|eval/i, cwe: "CWE-94", label: "Code Injection" },
  { match: /idor|object-level|bola/i, cwe: "CWE-639", label: "Insecure Direct Object Reference" },
  { match: /auth(?!orized)|broken authentication|jwt/i, cwe: "CWE-287", label: "Improper Authentication" },
  { match: /privilege|admin-only|bfla/i, cwe: "CWE-862", label: "Missing Authorization" },
  { match: /csrf|xsrf/i, cwe: "CWE-352", label: "CSRF" },
  { match: /ssrf|server-side request/i, cwe: "CWE-918", label: "SSRF" },
  { match: /open redirect/i, cwe: "CWE-601", label: "Open Redirect" },
  { match: /upload/i, cwe: "CWE-434", label: "Unrestricted File Upload" },
  { match: /deserial|pickle|yaml/i, cwe: "CWE-502", label: "Deserialization of Untrusted Data" },
  { match: /traversal|\.\.\//, cwe: "CWE-22", label: "Path Traversal" },
  { match: /xxe|xml external/i, cwe: "CWE-611", label: "XXE" },
  { match: /hardcoded|secret|credential/i, cwe: "CWE-798", label: "Hardcoded Credentials" },
  { match: /weak hash|md5|sha1/i, cwe: "CWE-327", label: "Weak Cryptography" },
];

/** Resolve the most specific CWE for a finding title (bare id, e.g. CWE-89). */
export function resolveCwe(title: string): { cwe: string; label: string } | null {
  const hit = CWE_MAP.find((e) => e.match.test(title));
  return hit ? { cwe: hit.cwe, label: hit.label } : null;
}

/** Three closure states only — there is no fourth state. */
export type FindingClosure = "confirmed" | "ruled_out" | "open_proof_gap";

export interface ValidatedFinding {
  title: string;
  cwe: string | null;
  closure: FindingClosure;
  /** Required: what control, at what file:line, does what, before which sink, on every path. */
  counterevidence: string;
  confidence: "high" | "medium" | "low";
  /** Conditions under which the severity must change. */
  severityChangeConditions: string;
}

/**
 * Validate a finding Strix-style: confirmed needs a PoC or a complete
 * source→control→sink→impact trace; ruled_out needs the control spelled out.
 * Rate the weakness proved, not the worst case imagined.
 */
export function validateFinding(input: {
  title: string;
  poc?: string;
  trace?: { source: string; control: string; sink: string; impact: string };
  ruledOutBecause?: string;
}): ValidatedFinding {
  const cwe = resolveCwe(input.title);
  if (input.poc || input.trace) {
    return {
      title: input.title,
      cwe: cwe?.cwe ?? null,
      closure: "confirmed",
      counterevidence: input.trace
        ? `source ${input.trace.source} → control ${input.trace.control} → sink ${input.trace.sink} → impact ${input.trace.impact}`
        : `working PoC: ${(input.poc ?? "").slice(0, 300)}`,
      confidence: input.poc ? "high" : "medium",
      severityChangeConditions: "Downgrade if the sink proves unreachable or a control covers every path.",
    };
  }
  if (input.ruledOutBecause) {
    return {
      title: input.title,
      cwe: cwe?.cwe ?? null,
      closure: "ruled_out",
      counterevidence: input.ruledOutBecause,
      confidence: "high",
      severityChangeConditions: "Reopen if a new path to the sink appears.",
    };
  }
  return {
    title: input.title,
    cwe: cwe?.cwe ?? null,
    closure: "open_proof_gap",
    counterevidence: "plausible but neither confirmed nor ruled out — needs follow-up",
    confidence: "low",
    severityChangeConditions: "Confirm with PoC/trace or rule out with control evidence.",
  };
}
