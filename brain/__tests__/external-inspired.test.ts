import { describe, it, expect } from "vitest";
import { scanCodeForDangerousPatterns, isPatternClean, loadCustomPatterns, isReDoSSafe, DANGEROUS_PATTERNS } from "../security/patterns/index";
import { OWASP_TOP_10, scoreSeverity, classifyOwasp, rankFindings, resolveCwe, validateFinding } from "../security/owasp/index";
import { bundleFiles, matchReviewRules, selectFile, matchGlob, resolveRules, capBundleSize, filterForPrecision } from "../review/bundling/index";
import { SIMPLICITY_LADDER, AUDIT_HUNT, evaluateAgainstLadder, detectOverEngineering, formatFinding, netLinesSaved, mayDelete } from "../coding/simplicity/index";
import { TddCycle, TDD_CHECKLIST, TDD_RED_FLAGS } from "../cognition/tdd/index";
import { SystematicDebug } from "../debugging/systematic/index";
import { extractLessons, summarizeSession, toPreview, shouldSkipObservation, stripPrivate, estimateObservationTokens, fitContextBudget } from "../memory/learning/index";
import { SkillRegistry, tagPlan, buildChain } from "../skills/index";
import { gateWrite, recordFacts, __resetGateForTests } from "../cognition/gateguard/index";
import { verifyCompletion } from "../testing/verification/index";
import { CodePerceptionEngine } from "../coding/perception/CodePerceptionEngine";
import { MemoryManager } from "../memory/MemoryManager";
import { SecurityManager } from "../security/SecurityManager";

describe("security patterns (security-guidance)", () => {
  it("flags known-dangerous code with line numbers", () => {
    const findings = scanCodeForDangerousPatterns('import yaml\ndata = yaml.load(payload)\npassword = "hunter2hunter"\n');
    const ids = findings.map((f) => f.patternId);
    expect(ids).toContain("yaml-load");
    expect(ids).toContain("hardcoded-password");
    expect(findings[0].line).toBeGreaterThan(0);
    expect(DANGEROUS_PATTERNS.length).toBeGreaterThanOrEqual(25);
  });
  it("respects inline justifications as exclusions", () => {
    const clean = scanCodeForDangerousPatterns('x = yaml.load(payload)  # nosec - trusted internal fixture\n');
    expect(clean.filter((f) => f.patternId === "yaml-load")).toHaveLength(0);
  });
  it("isPatternClean passes safe code", () => {
    expect(isPatternClean("import yaml\ndata = yaml.safe_load(payload)\n")).toBe(true);
  });
  it("SecurityManager.scanCode audits findings", () => {
    const sec = new SecurityManager();
    const findings = sec.scanCode("eval(userInput)");
    expect(findings.length).toBeGreaterThan(0);
    expect(sec.getAudit().some((a) => a.action.includes("eval-call"))).toBe(true);
  });
});

describe("owasp scoring (strix)", () => {
  it("covers the OWASP Top 10", () => {
    expect(OWASP_TOP_10).toHaveLength(10);
    expect(OWASP_TOP_10[0].id).toBe("A01");
  });
  it("scores critical for internet-exposed RCE-like findings", () => {
    const { score, rating } = scoreSeverity(1, 1, 1);
    expect(score).toBe(10);
    expect(rating).toBe("critical");
  });
  it("classifies SQL injection text to A03", () => {
    const cats = classifyOwasp("SQL injection via concatenated query");
    expect(cats.map((c) => c.id)).toContain("A03");
  });
  it("ranks worst-first", () => {
    const ranked = rankFindings(["typo in comment", "SQL injection via concatenated query"], (t) =>
      t.includes("SQL") ? { exploitability: 0.9, impact: 0.9 } : { exploitability: 0.1, impact: 0.1 },
    );
    expect(ranked[0].title).toContain("SQL");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});

describe("review bundling (open-code-review)", () => {
  it("bundles tests with their source", () => {
    const bundles = bundleFiles(["src/auth.ts", "src/auth.test.ts", "src/i18n/messages_en.properties", "src/i18n/messages_zh.properties"]);
    const withSource = bundles.find((b) => b.paths.includes("src/auth.ts"));
    expect(withSource?.paths).toContain("src/auth.test.ts");
    const i18n = bundles.find((b) => b.kind === "i18n");
    expect(i18n?.paths).toHaveLength(2);
  });
  it("skips vendor and lockfiles", () => {
    const bundles = bundleFiles(["node_modules/x/index.js", "pnpm-lock.yaml"]);
    expect(bundles.every((b) => b.kind === "skip" || b.rules.length === 0)).toBe(true);
  });
  it("matches auth rules to auth files", () => {
    expect(matchReviewRules("src/login.ts")).toContain("access-control");
    expect(matchReviewRules("db/migration.sql")).toContain("sql-injection");
  });
});

describe("simplicity ladder (ponytail)", () => {
  it("has 7 rungs and never-cut list", () => {
    expect(SIMPLICITY_LADDER).toHaveLength(7);
  });
  it("prefers reuse over new code", () => {
    const v = evaluateAgainstLadder({ reusesExisting: true, usesStdlib: false, usesNativeFeature: false, usesInstalledDependency: false, addsNewDependency: false, linesAdded: 40 });
    expect(v.rung).toBe(2);
  });
  it("prefers native features", () => {
    const v = evaluateAgainstLadder({ reusesExisting: false, usesStdlib: false, usesNativeFeature: true, usesInstalledDependency: false, addsNewDependency: false, linesAdded: 23 });
    expect(v.rung).toBe(4);
  });
  it("flags over-engineering with a delete-list", () => {
    const r = detectOverEngineering({ linesAdded: 404, filesAdded: 6, newDependencies: 1, nativeAlternativeExists: true, reusesExisting: false });
    expect(r.score).toBeGreaterThan(0.5);
    expect(r.deleteList.length).toBeGreaterThan(0);
    expect(r.flags).toContain("native-platform-alternative-exists");
  });
});

describe("tdd cycle (superpowers)", () => {
  it("blocks green before red", () => {
    const tdd = new TddCycle("add sum()");
    expect(tdd.advance()).toEqual({ ok: false, reason: expect.stringContaining("RED") });
  });
  it("runs red → green → refactor → done", () => {
    const tdd = new TddCycle("add sum()");
    tdd.recordTestResult(false, "sum is not defined");
    expect(tdd.advance().ok).toBe(true);
    expect(tdd.current()).toBe("green");
    tdd.recordTestResult(false);
    tdd.recordTestResult(true);
    expect(tdd.advance().ok).toBe(true);
    expect(tdd.advance().ok).toBe(true);
    expect(tdd.current()).toBe("done");
    expect(tdd.nextAction().instruction).toContain("Commit");
  });
  it("records code-before-test violations", () => {
    const tdd = new TddCycle("add sum()");
    tdd.recordProductionCode("wrote sum() first");
    expect(tdd.violations().some((v) => v.includes("code-before-test"))).toBe(true);
  });
});

describe("systematic debugging (superpowers)", () => {
  it("gates every phase on evidence", () => {
    const d = new SystematicDebug("login 500");
    expect(d.advance().ok).toBe(false);
    d.observe("POST /login → 500, repro steps recorded");
    expect(d.advance().ok).toBe(true);
    expect(d.current()).toBe("isolate");
    expect(d.nextAction().requires).toContain("minimal trigger");
  });
  it("reaches done only with full evidence", () => {
    const d = new SystematicDebug("login 500");
    for (let i = 0; i < 4; i++) {
      d.observe(`evidence for ${d.current()}`);
      expect(d.advance().ok).toBe(true);
    }
    expect(d.current()).toBe("done");
  });
});

describe("learning + progressive disclosure (ECC + claude-mem)", () => {
  it("extracts a routing lesson from fallbacks", () => {
    const lessons = extractLessons({
      goal: "Explain model routing", taskId: "t1", actions: [], evaluation: null,
      fallbacks: 2, modelUsed: "mock-reasoner", durationMs: 100,
    });
    expect(lessons.some((l) => l.kind === "decision" && l.title.includes("fell back 2x"))).toBe(true);
  });
  it("extracts a revision lesson", () => {
    const lessons = extractLessons({
      goal: "Build X", taskId: "t2", actions: [],
      evaluation: { completeness: 0.5, correctness: 0.5, requirementCoverage: 0.5, needsRevision: true, issues: ["missing tests"], suggestedNextAction: "add tests" },
      fallbacks: 0, modelUsed: "m", durationMs: 10,
    });
    expect(lessons.some((l) => l.kind === "bugfix")).toBe(true);
  });
  it("summarizes a session", () => {
    const s = summarizeSession({ goal: "Do Y", taskId: "t3", actions: [], evaluation: null, fallbacks: 0, modelUsed: "m", durationMs: 5 });
    expect(s).toContain("Do Y");
    expect(s).toContain("t3");
  });
  it("truncates previews", () => {
    expect(toPreview("a ".repeat(200), 160).length).toBeLessThanOrEqual(161);
  });
  it("searchIndex returns compact entries without full content", async () => {
    const mem = new MemoryManager();
    await mem.remember("The deploy pipeline uses blue-green deploys on Fridays", "semantic", { importance: 0.9 });
    const idx = await mem.searchIndex({ text: "deploy pipeline", topK: 3 });
    expect(idx.length).toBeGreaterThan(0);
    expect(idx[0].preview.length).toBeLessThanOrEqual(161);
    expect(idx[0].score).toBeDefined();
  });
});

describe("perception failure visibility", () => {
  it("records parse failures instead of swallowing them", () => {
    const engine = new CodePerceptionEngine();
    expect(engine.lastError()).toBeNull();
    const parsed = engine.perceiveFile("a.ts", "function ok() {}");
    expect(parsed.symbols.length).toBeGreaterThan(0);
    expect(engine.lastError()).toBeNull();
    engine.register({ language: "rust", parse: () => { throw new Error("boom"); } });
    const fallback = engine.perceiveFile("b.rs", "fn main() {}", "rust");
    expect(fallback.symbols).toHaveLength(0);
    expect(engine.lastError()).toBe("boom");
  });
});
describe("skills registry (ECC + superpowers)", () => {
  it("suggests tdd for feature work and debug for bugs", () => {
    const r = new SkillRegistry();
    expect(r.suggest("implement login with tests").map((s) => s.name)).toContain("tdd-cycle");
    expect(r.suggest("fix the broken checkout bug").map((s) => s.name)).toContain("systematic-debug");
    expect(r.suggest("review this diff for over-engineering").map((s) => s.name)).toContain("simplicity-review");
  });
  it("runs a skill into steps", () => {
    const r = new SkillRegistry();
    const steps = r.run("owasp-review", { goal: "audit auth" });
    expect(steps.map((s) => s.title)).toEqual(["PATTERN-SCAN", "CLASSIFY", "RANK"]);
    expect(() => r.run("nope", { goal: "x" })).toThrow("Unknown skill");
  });
  it("compiles goals into reviewer-terminated chains", () => {
    expect(tagPlan("implement dark mode")).toBe("impl");
    expect(tagPlan("implement login")).toBe("impl+security");
    expect(tagPlan("add users table migration")).toBe("impl+db");
    const { chain } = buildChain("implement encrypted login");
    expect(chain.length).toBeLessThanOrEqual(4);
    expect(chain[chain.length - 1]).toContain("reviewer");
  });
  it("honors skip conditions", () => {
    const r = new SkillRegistry([{ name: "x", description: "x", triggers: ["debug"], skipWhen: ["trivial"], steps: () => [] }]);
    expect(r.suggest("debug this").map((s) => s.name)).toContain("x");
    expect(r.suggest("debug this trivial typo").map((s) => s.name)).not.toContain("x");
  });
});

describe("second-wave integrations (cloned sources)", () => {
  it("flags strix-class patterns (go shell, ECB, TLS off, SRI)", () => {
    const code = [
      'exec.Command("sh", "-c", cmd)',
      "const c = crypto.createCipher('aes-128-ecb', k)",
      "const agent = new https.Agent({ rejectUnauthorized: false })",
      '<script src="https://cdn.example.com/x.js"></script>',
    ].join("\n");
    const ids = scanCodeForDangerousPatterns(code).map((f) => f.patternId);
    expect(ids).toContain("go-exec-shell");
    expect(ids).toContain("weak-cipher");
    expect(ids).toContain("tls-disabled");
    expect(ids).toContain("script-no-sri");
  });
  it("loads custom patterns and rejects ReDoS-unsafe ones", () => {
    expect(isReDoSSafe("password\\s*=\\s*.+")).toBe(true);
    const { patterns, skipped } = loadCustomPatterns([
      { id: "org-rule", title: "Org rule", severity: "medium", regex: "internal\\.example\\.com", message: "Internal host." },
      { id: "evil", title: "Evil", severity: "medium", regex: "(a+)+$", message: "ReDoS." },
    ]);
    expect(patterns.map((p) => p.id)).toContain("org-rule");
    expect(skipped).toContain("evil");
  });
  it("resolves specific child CWEs and validates closures", () => {
    expect(resolveCwe("SQL injection via concatenated query")?.cwe).toBe("CWE-89");
    const confirmed = validateFinding({ title: "SQL injection", poc: "1' OR '1'='1" });
    expect(confirmed.closure).toBe("confirmed");
    expect(confirmed.confidence).toBe("high");
    const gap = validateFinding({ title: "mysterious auth thing" });
    expect(gap.closure).toBe("open_proof_gap");
    const out = validateFinding({ title: "XSS?", ruledOutBecause: "output encoded at app.ts:42 on every path" });
    expect(out.closure).toBe("ruled_out");
  });
  it("selects review files with 6 gates", () => {
    expect(selectFile("src/a.ts").keep).toBe(true);
    expect(selectFile("logo.png").reason).toBe("binary");
    expect(selectFile(".env").reason).toBe("secret");
    expect(selectFile("pnpm-lock.yaml").reason).toBe("default-path");
    expect(selectFile("src/a.test.ts").reason).toBe("default-path");
    expect(selectFile("src/a.test.ts", { include: ["**/*.test.ts"] }).keep).toBe(true);
  });
  it("matches globs and resolves layered rules", () => {
    expect(matchGlob("src/a.test.ts", "**/*.test.ts")).toBe(true);
    expect(matchGlob("src/a.ts", "**/*.test.ts")).toBe(false);
    const r = resolveRules("db/m.sql", { project: { entries: [{ path: "**/*.sql", rule: "No SELECT *." }] } });
    expect(r.system).toHaveLength(0);
    expect(r.user).toEqual(["No SELECT *."]);
    const merged = resolveRules("db/m.sql", { project: { entries: [{ path: "**/*.sql", rule: "Extra.", mergeSystemRule: true }] } });
    expect(merged.system.length).toBeGreaterThan(0);
    expect(merged.user).toEqual(["Extra."]);
  });
  it("caps bundles and filters for precision", () => {
    const big = { id: "b", paths: Array.from({ length: 25 }, (_, i) => `src/f${i}.ts`), kind: "source" as const, rules: [], reason: "x" };
    expect(capBundleSize(big).length).toBe(3);
    expect(filterForPrecision([{ severity: "low" }, { severity: "high" }, { severity: "low", evidence: "traced" }])).toHaveLength(2);
  });
  it("emits ponytail-tagged findings with net lines", () => {
    const f = formatFinding({ tag: "native", file: "ui/picker.tsx", line: 4, what: "moment.js for one format", replacement: "Intl.DateTimeFormat, 0 deps" });
    expect(f).toBe("ui/picker.tsx:L4: native: moment.js for one format. Intl.DateTimeFormat, 0 deps.");
    expect(netLinesSaved([{ tag: "delete", file: "a", line: 1, what: "x", replacement: "nothing", linesRemoved: 40, linesAdded: 0 }])).toBe(40);
    expect(mayDelete(0)).toBe(true);
    expect(mayDelete(2)).toBe(false);
    expect(AUDIT_HUNT.length).toBeGreaterThan(0);
  });
  it("enforces VERIFY_RED and exposes the checklist", () => {
    const tdd = new TddCycle("sum");
    expect(tdd.verifyRed({ failed: false, failedAsError: false, expectedMessage: false }).ok).toBe(false);
    expect(tdd.verifyRed({ failed: true, failedAsError: false, expectedMessage: true }).ok).toBe(true);
    expect(TDD_CHECKLIST.length).toBeGreaterThan(0);
    expect(TDD_RED_FLAGS).toContain("quick fix for now");
  });
  it("tracks hypotheses and the 3-fix breaker", () => {
    const d = new SystematicDebug("500");
    d.observe("repro evidence");
    d.advance();
    d.hypothesize("null user", "stack points at session.ts:9");
    d.observe("isolated");
    d.advance();
    d.observe("fix 1");
    d.observe("fix 2");
    d.observe("fix 3");
    expect(d.fixAttempts()).toBe(3);
    expect(d.needsArchitecturalReview()).toBe(true);
  });
  it("skips noise, strips private, budgets context", () => {
    expect(shouldSkipObservation({ facts: [], narrative: "ok" }).skip).toBe(true);
    expect(shouldSkipObservation({ facts: ["f"], narrative: "ok" }).skip).toBe(false);
    expect(stripPrivate("a <private>secret</private> b")).toBe("a  b");
    expect(estimateObservationTokens({ title: "t", subtitle: "s", narrative: "n", facts: ["f"] })).toBeGreaterThan(0);
    expect(fitContextBudget([1, 2, 3, 4], String, 3)).toEqual([1, 2]);
  });
  it("gates first writes on facts", () => {
    __resetGateForTests();
    const g = gateWrite("edit", "src/a.ts");
    expect(g.allowed).toBe(false);
    expect(g.demands.length).toBeGreaterThan(0);
    recordFacts("edit", "src/a.ts");
    expect(gateWrite("edit", "src/a.ts").allowed).toBe(true);
    expect(gateWrite("destructive-bash", "rm -rf /").demands.join(" ")).toContain("rollback");
  });
  it("blocks unverified completion claims", () => {
    const bad = verifyCompletion([{ kind: "tests", evidence: "", passed: false }]);
    expect(bad.ready).toBe(false);
    const hedged = verifyCompletion([{ kind: "lint", evidence: "should be clean", passed: true }]);
    expect(hedged.ready).toBe(false);
    const good = verifyCompletion([
      { kind: "tests", evidence: "46 passed, 0 failed", passed: true },
      { kind: "build", evidence: "exit 0", passed: true },
    ]);
    expect(good.ready).toBe(true);
  });
});
