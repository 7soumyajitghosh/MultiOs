# Unified AI Brain

ONE root: `brain/` — ALL AI intelligence lives here.

Animation Brain + Human-Like Coding Brain + Autonomous Loop + Memory +
Reasoning + Agents + Tools + Model Router = ONE unified `brain/`.

## Layout

- `core/` — `brain/Brain.ts` (`Brain`), `brain.ts` (`UnifiedBrain` wrapper),
  `brain-loop.ts`, `cognitive-state.ts` (barrel over `state/CognitiveState.ts`),
  `task-state.ts`, `orchestrator.ts`, `ids.ts`, `index.ts` (canonical barrel)
- `perception/` — input / code / repository / website / animation / visual
- `understanding/` — code / intent / architecture / data-flow / control-flow /
  dependency-analysis / animation (7 stages)
- `animation/` — preserved Animation Brain (SEE → DETECT → TRACK → TIMELINE →
  TRIGGERS → EASING → SPATIAL → GRAPH → DSL → RECONSTRUCT → RENDER →
  COMPARE → IMPROVE) + barrels (`analyzer`, `parser`, `understanding`,
  `animation-dsl`, `reconstruction`, `renderer`, `comparator`, `optimizer`,
  `patterns`, `memory`)
- `codebase/` — indexer / parser / symbol-graph / dependency-graph /
  architecture-graph / data-flow / git-history / codebase-memory
- `cognition/` — reasoning / planning / intent / decision / hypothesis /
  verification / self-evaluation
- `coding/` — preserved Human-Like Coding Brain (READ → INTENT → ARCHITECTURE →
  MODEL → PLAN → WRITE → RUN → DEBUG → TEST → REVIEW → REFACTOR → VERIFY)
- `debugging/`, `testing/`, `review/`
- `memory/`, `context/`, `models/`, `agents/`, `tools/` — SHARED services
  (no duplicates; coding and animation brains use the same instances)
- `loops/` — build / test / debug / improvement / animation / autonomous
- `security/`, `performance/`, `observability/`, `schemas/`, `config/`
- `config/constants.ts` — ALL tunables (limits, weights, thresholds) in one place
- `core/ids.ts` — collision-free ID generation (`crypto.randomUUID` + fallback)

## Import rules

- Prefer barrels: `./core`, `./config`, `./schemas`, `./models`, `./memory`,
  `./tools`, `./reasoning`, `./planner`, `./rag`, `./token`.
- Never import `ToolRegistry` from `tools/browser` (that barrel is the
  browser-tool contract, not the registry).
- IDs: always use `uid(prefix)` from `core/ids` — never `Math.random`/`Date.now` inline.

## Preserved capabilities (19)

1. Animation Understanding, 2. Animation Analysis/Reconstruction,
3. Autonomous Build→Test→Fix→Improve, 4. Human-Like Coding,
5. Code Understanding, 6. Codebase Memory, 7. Reasoning, 8. Planning,
9. Debugging, 10. Testing, 11. Code Review, 12. Model Routing, 13. Agents,
14. Tools, 15. Context, 16. Memory, 17. Security, 18. Performance,
19. Self-Evaluation.

Original implementations were consolidated into `brain/*`
and `brain/animation/*` as the single source of truth.
Duplicate copies (`brain/ai-brain/*`, `brain/animation-brain/*`) and
backward-compat shims (`src/ai-brain`, `src/animation-brain`) were removed;
UI imports point directly at `brain/`.

## Adopted from external systems (7 concepts, original implementations)

| Source | Concept adopted | Brain module |
|---|---|---|
| `affaan-m/ECC` | Continuous learning (wins → lessons), session summaries, GateGuard fact-forcing, plan→chain compiler, skip-conditions | `memory/learning`, `cognition/gateguard`, `skills` (`tagPlan`/`buildChain`) |
| `obra/superpowers` | RED-GREEN-REFACTOR TDD + VERIFY_RED, 4-phase systematic debugging + hypothesis + 3-fix breaker, spec-first gate, verification claim table | `cognition/tdd`, `debugging/systematic`, `testing/verification`, `skills` (`spec-first`) |
| `thedotmack/claude-mem` | Progressive-disclosure retrieval (index → details), typed observations, fact/narrative/concept schema, noise gate, `<private>` stripping, context budget | `MemoryManager.searchIndex`, `memory/learning` |
| `DietrichGebert/ponytail` | YAGNI ladder, over-engineering delete-list, never-cut guards, tagged findings (`delete/stdlib/native/reuse/yagni/shrink`), audit hunt, pre-delete rule | `coding/simplicity` |
| `usestrix/strix` | OWASP coverage, CVSS-like ranking, specific-child CWEs, confirmed/ruled-out/proof-gap closures, counterevidence discipline | `security/owasp` |
| `alibaba/open-code-review` | Deterministic bundling + 6-gate file selection, layered rules (flag>project>global>builtin), group caps, precision-over-recall filter | `review/bundling` |
| `anthropics/security-guidance` | Instant dangerous-pattern scan (25+ patterns), custom patterns + ReDoS guard, inline-justification exclusions | `security/patterns` (+ `SecurityManager.scanCode`) |

Skills-first entry: `SkillRegistry` in `brain/skills` (`tdd-cycle`,
`systematic-debug`, `simplicity-review`, `owasp-review`,
`session-learning`, `spec-first`).

## Usage

```ts
import { UnifiedBrain, getOrchestrator } from "./brain/index";
// Barrels (preferred):
//   import { Brain } from "./brain/core";
//   import { loadConfig, BRAIN_LIMITS } from "./brain/config";
const brain = new UnifiedBrain();
await brain.run({ goal: "Explain model routing" });
brain.analyzeAnimation("<div>...</div>");
```

## Build / verify

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (no-explicit-any, no-non-null-assertion)
npm run test        # vitest run
npm run build       # tsc emit to dist/
```

Central loops:

- Code: OBSERVE → UNDERSTAND → PLAN → BUILD → RUN → TEST → ANALYZE →
  FIX → RETEST → REVIEW → OPTIMIZE → VERIFY (`brain/core/brain-loop.ts`)
- Animation: OBSERVE → UNDERSTAND → RECONSTRUCT → RENDER → COMPARE →
  FIND DIFFERENCE → IMPROVE → RENDER AGAIN (`brain/loops/animation-loop/loop.ts`)
