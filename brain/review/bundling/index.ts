// brain/review/bundling/index.ts — deterministic review planning.
// Inspired by alibaba/open-code-review (deterministic pipeline x agent hybrid):
// precise file selection, smart bundling into review units, per-file rule matching.
// Original implementation: pure functions, no LLM calls.
export interface FileBundle {
  id: string;
  paths: string[];
  kind: "source" | "test" | "i18n" | "config" | "docs" | "skip";
  rules: string[];
  reason: string;
}

const SKIP = /(^|\/)(node_modules|dist|build|coverage|\.git|\.next|vendor)(\/|$)|(\.min\.js|\.min\.css|\.lock|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/;
const TEST = /(\.test\.|\.spec\.|__tests__)/;
const I18N = /(messages?_|locale|i18n).*(_en|_zh|\.en|\.zh)?\.(properties|json)$/i;
const CONFIG = /(\.json|\.ya?ml|\.toml|\.ini|\.config\.[jt]s|Dockerfile|Makefile)$/;
const DOCS = /(\.md|\.mdx|\.txt)$/;

function kindOf(path: string): FileBundle["kind"] {
  if (SKIP.test(path)) return "skip";
  if (TEST.test(path)) return "test";
  if (I18N.test(path)) return "i18n";
  if (CONFIG.test(path)) return "config";
  if (DOCS.test(path)) return "docs";
  return "source";
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

function stem(path: string): string {
  return basename(path).replace(/\.(test|spec)\.[^.]+$/, "").replace(/\.[^.]+$/, "");
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "." : path.slice(0, i);
}

/** Rule ids matched to a file's characteristics (stable, template-like matching). */
export function matchReviewRules(path: string): string[] {  if (SKIP.test(path)) return [];
  const rules = ["general-quality"];
  if (/\.(ts|tsx|js|jsx|vue)$/.test(path)) rules.push("xss", "error-handling");
  if (/auth|login|session|password|token/i.test(path)) rules.push("access-control", "auth-failures");
  if (/\.(sql|prisma)$/.test(path) || /migrat/i.test(path)) rules.push("sql-injection", "data-integrity");
  if (/api|route|controller|handler/i.test(path)) rules.push("input-validation", "rate-limit", "ssrf");
  if (/\.(py|rb|php)$/.test(path)) rules.push("injection", "deserialization");
  if (/(upload|file)/i.test(path)) rules.push("path-traversal", "file-validation");
  if (/crypt|secret|key/i.test(path)) rules.push("crypto-failures", "secret-management");
  if (TEST.test(path)) rules.push("test-quality");
  if (/(Dockerfile|docker-compose|\.tf$)/.test(path)) rules.push("misconfiguration");
  return [...new Set(rules)];
}

/**
 * Group changed files into review units (divide-and-conquer):
 * i18n pairs bundle together, tests bundle with their source, same-dir sources bundle.
 */
export function bundleFiles(paths: string[]): FileBundle[] {
  const unique = [...new Set(paths)];
  const bundles: FileBundle[] = [];
  let n = 0;
  // First pass: attach test files to their source so sources are not double-bundled.
  const attachedSources = new Set<string>();
  for (const t of unique) {
    if (kindOf(t) !== "test") continue;
    const src = unique.find((p) => p !== t && kindOf(p) === "source" && stem(p) === stem(t));
    if (src) {
      attachedSources.add(src);
      bundles.push({ id: `bundle_${n++}`, paths: [src, t], kind: "source", rules: ["general-quality", "test-quality", "test-coverage"], reason: "Tests bundled with their source files" });
    }
  }
  const attachedTests = new Set(bundles.flatMap((b) => b.paths));
  const byDir = new Map<string, string[]>();
  for (const p of unique) {
    if (attachedTests.has(p)) continue;
    const k = `${dirOf(p)}::${kindOf(p)}`;
    const arr = byDir.get(k) ?? [];
    arr.push(p);
    byDir.set(k, arr);
  }
  for (const [key, group] of byDir) {
    const [dir, kind] = key.split("::") as [string, FileBundle["kind"]];
    if (kind === "skip") {
      bundles.push({ id: `bundle_${n++}`, paths: group, kind, rules: [], reason: `Skipped generated/vendor paths in ${dir}` });
      continue;
    }
    if (kind === "test") {
      // Standalone tests whose source did not change.
      bundles.push({ id: `bundle_${n++}`, paths: group, kind: "test", rules: ["test-quality"], reason: `Standalone tests in ${dir}` });
      continue;
    }
    const rules = [...new Set(group.flatMap(matchReviewRules))];
    const reason =
      kind === "i18n" ? `i18n pair/set reviewed as one unit in ${dir}`
      : `${kind} files in ${dir} reviewed as one unit`;
    bundles.push({ id: `bundle_${n++}`, paths: group, kind, rules, reason });
  }
  return bundles.sort((a, b) => a.id.localeCompare(b.id));
}

// ---- Deterministic file selection (6 gates, OCR selection.go) ----

export type ExclusionReason = "binary" | "secret" | "user-excluded" | "unsupported-ext" | "default-path" | null;

const SECRET_PATHS = /(\.ssh\/|id_rsa|\.npmrc|^\.env$|\.env\.local|\.pem$|\.key$)/;
const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|pdf|zip|tar|gz|exe|dll|so|dylib|o|a|class|pyc)$/i;
const SUPPORTED_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|vue|py|pyi|java|go|rb|php|rs|c|h|cpp|cc|cxx|hpp|cs|swift|kt|sql|xml|yaml|yml|json|toml|ini|md|mdx|txt|html|css|scss|Dockerfile|tf)$/i;
const DEFAULT_PATH = /(__tests__|_test\.go|\.test\.|\.spec\.|node_modules|vendor|target\/|dist\/|__pycache__|\.next\/|-lock\.yaml$|\.lock$|yarn\.lock$)/;

/** Six-gate selection: binary → secret (unoverridable) → user-exclude → user-include (bypass) → ext → default-path. */
export function selectFile(path: string, opts: { include?: string[]; exclude?: string[] } = {}): { keep: boolean; reason: ExclusionReason } {
  if (BINARY_EXT.test(path)) return { keep: false, reason: "binary" };
  if (SECRET_PATHS.test(path)) return { keep: false, reason: "secret" };
  if (opts.exclude?.some((g) => matchGlob(path, g))) return { keep: false, reason: "user-excluded" };
  if (opts.include?.some((g) => matchGlob(path, g))) return { keep: true, reason: null };
  const base = path.split("/").pop() ?? path;
  const ext = base.includes(".") ? `.${base.split(".").pop()}` : "";
  if (!SUPPORTED_EXT.test(ext) && !/Dockerfile|Makefile/.test(base)) return { keep: false, reason: "unsupported-ext" };
  if (DEFAULT_PATH.test(path)) return { keep: false, reason: "default-path" };
  return { keep: true, reason: null };
}

/** Minimal glob matcher (*, **, ? — case-insensitive, OCR doublestar subset). */
export function matchGlob(path: string, glob: string): boolean {
  const rx = glob
    .toLowerCase()
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "§")
    .replace(/\*/g, "[^/]*")
    .replace(/§/g, ".*")
    .replace(/\?/g, "[^/]");
  return new RegExp(`^${rx}$`).test(path.toLowerCase());
}

// ---- Layered rule resolution (flag > project > global > builtin) ----

export interface RuleLayer {
  /** Glob → rule body. First match in declaration order wins. */
  entries: Array<{ path: string; rule: string; mergeSystemRule?: boolean }>;
}

/**
 * Resolve the rule text for a file across layers.
 * mergeSystemRule=false replaces the builtin; true combines both halves.
 */
export function resolveRules(path: string, layers: { flag?: RuleLayer; project?: RuleLayer; global?: RuleLayer }): { system: string[]; user: string[] } {
  const system = matchReviewRules(path);
  const ordered = [layers.flag, layers.project, layers.global].filter((l): l is RuleLayer => !!l);
  for (const layer of ordered) {
    const hit = layer.entries.find((e) => matchGlob(path, e.path));
    if (hit) {
      if (hit.mergeSystemRule) return { system, user: [hit.rule] };
      return { system: [], user: [hit.rule] };
    }
  }
  return { system, user: [] };
}

/** Split oversize groups into ≤maxFiles chunks (OCR maxFilesPerGroup = 10). */
export function capBundleSize(bundle: FileBundle, maxFiles = 10): FileBundle[] {
  if (bundle.paths.length <= maxFiles) return [bundle];
  const out: FileBundle[] = [];
  for (let i = 0; i < bundle.paths.length; i += maxFiles) {
    out.push({ ...bundle, id: `${bundle.id}_${i / maxFiles}`, paths: bundle.paths.slice(i, i + maxFiles) });
  }
  return out;
}

/**
 * Precision-over-recall filter: drop low-severity findings unless backed by
 * evidence; silence reports when context is unclear. False alarm > miss.
 */
export function filterForPrecision<T extends { severity: string; evidence?: string }>(findings: T[]): T[] {
  return findings.filter((f) => f.severity !== "low" || (f.evidence && f.evidence.trim().length > 0));
}
