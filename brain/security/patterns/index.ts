// brain/security/patterns/index.ts — instant dangerous-pattern scanner.
// Inspired by anthropics/claude-code security-guidance (layer 1: pattern warnings).
// Original implementation: regex catalog + line-precise findings + inline-justification exclusions.
export type PatternSeverity = "critical" | "high" | "medium";

export interface DangerousPattern {
  id: string;
  title: string;
  severity: PatternSeverity;
  regex: RegExp;
  message: string;
  /** If set, only applies to these language ids; otherwise language-agnostic. */
  languages?: string[];
}

export interface PatternFinding {
  patternId: string;
  title: string;
  severity: PatternSeverity;
  line: number;
  excerpt: string;
  message: string;
}

/** ~25 known-dangerous patterns. Runs synchronously on every edit/write path. */
export const DANGEROUS_PATTERNS: DangerousPattern[] = [
  { id: "yaml-load", title: "Unsafe YAML deserialization", severity: "critical", regex: /(?<!safe_)yaml\.(load|unsafe_load)\s*\(/, message: "yaml.load/unsafe_load execute arbitrary Python via !!python/object tags. Use yaml.safe_load + schema validation." },
  { id: "pickle-load", title: "Pickle deserialization", severity: "critical", regex: /\b(pickle|cPickle|cloudpickle|dill)\.(load|loads|Unpickler)\b/, message: "Pickle-family loads execute code. Never unpickle untrusted data; prefer JSON or schema-validated deserializers (msgspec, pydantic)." },
  { id: "pickle-variants", title: "Pickle-equivalent load", severity: "critical", regex: /\b(joblib\.load|pandas\.read_pickle|numpy\.load\s*\([^)]*allow_pickle\s*=\s*True)/, message: "joblib/read_pickle/allow_pickle=True unpickle arbitrary code. Use safe formats instead." },
  { id: "torch-load", title: "Unsafe torch.load", severity: "high", regex: /torch\.load\s*\(/, message: "torch.load defaults are unsafe. Pass weights_only=True." },
  { id: "marshal-load", title: "Marshal/shelve deserialization", severity: "high", regex: /\b(marshal\.load|shelve\.open)\s*\(/, message: "marshal/shelve execute code on load. Avoid with untrusted data." },
  { id: "eval-call", title: "eval() usage", severity: "high", regex: /\beval\s*\(/, languages: ["js", "ts", "py"], message: "eval() executes arbitrary code. Use a safe parser instead." },
  { id: "new-function", title: "Function constructor", severity: "high", regex: /\bnew\s+Function\s*\(/, message: "new Function() is eval in disguise. Avoid with dynamic input." },
  { id: "inner-html", title: "Raw HTML injection", severity: "high", regex: /\.(innerHTML|outerHTML)\s*=/, message: "innerHTML/outerHTML with dynamic data is XSS. Sanitize or use textContent." },
  { id: "insert-adjacent-html", title: "insertAdjacentHTML injection", severity: "high", regex: /\.insertAdjacentHTML\s*\(/, message: "insertAdjacentHTML with dynamic data is XSS. Sanitize first." },
  { id: "script-no-sri", title: "External script without integrity", severity: "medium", regex: /<script[^>]+src=["']https?:[^"']+["'](?![^>]*integrity=)[^>]*>/i, message: "Third-party script without subresource integrity (SRI). Add an integrity hash." },
  { id: "document-write", title: "document.write", severity: "medium", regex: /document\.write\s*\(/, message: "document.write with dynamic data is XSS-prone." },
  { id: "dangerously-set-html", title: "dangerouslySetInnerHTML", severity: "high", regex: /dangerouslySetInnerHTML/, message: "Ensure the HTML is sanitized server-side before rendering." },
  { id: "v-html", title: "Vue v-html", severity: "high", regex: /\bv-html\s*=/, message: "v-html renders raw HTML. Sanitize untrusted content first." },
  { id: "hardcoded-password", title: "Hardcoded password", severity: "high", regex: /(password|passwd|pwd)\s*[:=]\s*["'][^"']{3,}["']/i, message: "Hardcoded credential. Move to a secret manager or env var." },
  { id: "hardcoded-api-key", title: "Hardcoded API key", severity: "high", regex: /(api[_-]?key|secret[_-]?key)\s*[:=]\s*["'][^"']{4,}["']/i, message: "Hardcoded API key. Move to env vars or a secret manager." },
  { id: "aws-secret", title: "Hardcoded AWS secret", severity: "critical", regex: /\b(AKIA[0-9A-Z]{16}|aws_secret.+["'][^"']+["'])/, message: "Possible AWS credential in code. Rotate and move to Secrets Manager." },
  { id: "private-key", title: "Private key material", severity: "critical", regex: /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/, message: "Private key in code. Remove immediately and rotate." },
  { id: "os-system", title: "os.system shell call", severity: "high", regex: /\bos\.system\s*\(/, message: "os.system invokes a shell. Use subprocess with an argv list." },
  { id: "shell-true", title: "subprocess shell=True", severity: "high", regex: /shell\s*=\s*True/, languages: ["py"], message: "shell=True with dynamic args is command injection. Use argv lists." },
  { id: "child-process-exec", title: "child_process exec", severity: "high", regex: /child_process\.(exec|execSync)\s*\(/, message: "exec() spawns a shell. Prefer execFile with argv." },
  { id: "go-exec-shell", title: "Go exec via shell", severity: "high", regex: /exec\.Command\s*\(\s*"(sh|bash|cmd)"\s*,/, message: "Shelling out from Go with dynamic args is command injection. Avoid the shell." },
  { id: "gha-injection", title: "GitHub Actions injection", severity: "high", regex: /\$\{\{\s*github\.event\.(issue\.title|.*comment\.body|.*commits.*message)/, message: "Untrusted GitHub context in run: steps is command injection. Use env: with quoting." },
  { id: "weak-cipher", title: "Weak cipher / ECB mode", severity: "high", regex: /\b(createCipher\b|AES\/ECB|MODE_ECB|cipher.*ecb)/i, message: "No-IV ciphers and ECB mode leak plaintext patterns. Use AES-GCM with a random IV." },
  { id: "tls-disabled", title: "TLS verification disabled", severity: "high", regex: /(rejectUnauthorized\s*:\s*false|verify\s*:\s*false|InsecureSkipVerify\s*:\s*true|ssl_verify\s*=\s*False|verify=False)/, message: "Disabled TLS verification enables MITM. Re-enable verification." },
  { id: "sql-concat", title: "SQL string concatenation", severity: "high", regex: /(SELECT|INSERT|UPDATE|DELETE)[^;\n]*\+/i, message: "SQL built by concatenation is injectable. Use parameterized queries." },
  { id: "ssrf-get", title: "Server-side request to dynamic URL", severity: "high", regex: /(requests\.(get|post)|fetch|axios\.(get|post))\s*\(\s*[`f'"]?[^'"`\s]*\$\{|\(\s*url\s*\+|url\s*\+/, message: "HTTP request to a user-controlled URL (SSRF). Allowlist the target." },
  { id: "jwt-none", title: "JWT none algorithm", severity: "critical", regex: /algorithms\s*:\s*\[[^\]]*["']none["']/, message: 'JWT "none" algorithm disables verification. Remove it.' },
  { id: "md5-password", title: "Weak password hash", severity: "medium", regex: /\b(md5|sha1)\s*\(\s*(password|passwd|pwd)/i, message: "MD5/SHA1 are not password hashes. Use bcrypt/argon2/scrypt." },
  { id: "math-random-token", title: "Math.random for secrets", severity: "medium", regex: /Math\.random\s*\(\)/, message: "Math.random is predictable. Use crypto.randomUUID/getRandomValues for tokens." },
  { id: "cors-wildcard", title: "CORS wildcard", severity: "medium", regex: /Access-Control-Allow-Origin["']?\s*[:=]\s*["']?\*/, message: "Wildcard CORS exposes the API to any origin. Restrict to known origins." },
  { id: "xxe-parse", title: "XML parse without hardening", severity: "high", regex: /\b(ET\.parse|lxml\.etree\.parse|xml\.dom\.minidom\.parse)\s*\(/, message: "XML parsers resolve external entities by default (XXE). Disable DTD/entity resolution." },
  { id: "path-traversal", title: "Path traversal join", severity: "medium", regex: /(path\.join|open|readFile|writeFile)\s*\([^)]*\.\.\//, message: "User-influenced path with ../ can escape the intended directory. Normalize + constrain." },
];

/** Lines carrying an inline justification are treated as reviewed exclusions. */
const JUSTIFICATION = /(nosec|nolint|ok:\s*safe|safe:\s)/i;

/** Scan code and return line-precise findings (empty = clean). */
export function scanCodeForDangerousPatterns(code: string, language?: string): PatternFinding[] {
  const findings: PatternFinding[] = [];
  const lines = code.split("\n");
  lines.forEach((line, i) => {
    if (JUSTIFICATION.test(line)) return;
    for (const p of DANGEROUS_PATTERNS) {
      if (p.languages && language && !p.languages.includes(language)) continue;
      p.regex.lastIndex = 0;
      if (p.regex.test(line)) {
        findings.push({
          patternId: p.id,
          title: p.title,
          severity: p.severity,
          line: i + 1,
          excerpt: line.trim().slice(0, 160),
          message: p.message,
        });
        break;
      }
    }
  });
  return findings;
}

/** True when no critical/high findings remain. */
export function isPatternClean(code: string, language?: string): boolean {
  return !scanCodeForDangerousPatterns(code, language).some((f) => f.severity !== "medium");
}

/** A custom org-specific pattern (security-patterns.yaml style). Additive only. */
export interface CustomPattern {
  id: string;
  title: string;
  severity: PatternSeverity;
  regex: string;
  message: string;
}

/**
 * ReDoS guard for custom regexes (mirrors security-guidance extensibility:
 * nested quantifiers are skipped, never loaded blind).
 */
export function isReDoSSafe(source: string): boolean {
  if (/(\+\+|\*\*)/.test(source)) return false;
  let depth = 0;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "(") {
      depth++;
      if (depth > 3) return false;
    } else if (c === ")") {
      depth = Math.max(0, depth - 1);
    }
  }
  // Quantified group: ( ... +/* ... )+/* — classic catastrophic backtracking shape.
  if (/\([^()]*[+*][^()]*\)[+*{?]/.test(source)) return false;
  return true;
}

/** Compile custom patterns, silently dropping ReDoS-unsafe ones. Returns skipped ids. */
export function loadCustomPatterns(custom: CustomPattern[]): { patterns: DangerousPattern[]; skipped: string[] } {
  const patterns: DangerousPattern[] = [];
  const skipped: string[] = [];
  for (const c of custom) {
    if (!isReDoSSafe(c.regex)) {
      skipped.push(c.id);
      continue;
    }
    try {
      patterns.push({ id: c.id, title: c.title, severity: c.severity, regex: new RegExp(c.regex), message: c.message });
    } catch {
      skipped.push(c.id);
    }
  }
  return { patterns, skipped };
}
