# ARCHITECTURE — Unified AI Brain

                    ┌──────────────┐
                    │     BRAIN    │  brain/core/brain.ts (UnifiedBrain)
                    └──────┬───────┘  brain/core/orchestrator.ts
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   PERCEPTION         COGNITION          MEMORY
   brain/             brain/             brain/
   perception/        cognition/         memory/
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
        CODING BRAIN              ANIMATION BRAIN
        brain/coding/             brain/animation/
             │                           │
        CODEBASE BRAIN             VISUAL BRAIN
        brain/codebase/            brain/perception/visual/
             │                           │
        DEBUGGING                 RECONSTRUCTION
        brain/debugging/          brain/animation/reconstruction/
             │                           │
        TESTING                    COMPARISON
        brain/testing/             brain/animation/comparator/
             │                           │
             └─────────────┬─────────────┘
                           │
                       EVALUATION
                       brain/cognition/self-evaluation/
                           │
                       IMPROVEMENT
                       brain/loops/improvement-loop/

## Shared services (single instances)

- `brain/memory/` + `brain/context/` + `brain/models/` + `brain/tools/`
  + `brain/agents/` + `brain/security/` + `brain/observability/`
  + `brain/cognition/` + `brain/loops/`

Barrels (import these, not deep files): `brain/core`, `brain/config`,
`brain/schemas`, `brain/models`, `brain/memory`, `brain/tools`,
`brain/reasoning`, `brain/planner`, `brain/rag`, `brain/token`.
Tunables live in `brain/config/constants.ts`; IDs come from `brain/core/ids.ts`.

Strength modules (original code, sourced from cloned repos under /tmp):
`security/patterns` (danger scan + custom patterns + ReDoS guard),
`security/owasp` (OWASP + CWE + closure states),
`review/bundling` (selection gates + layered rules + caps + precision filter),
`coding/simplicity` (YAGNI ladder + tagged findings),
`cognition/tdd` (RED-GREEN-REFACTOR + VERIFY_RED),
`cognition/gateguard` (fact-forcing first-write gate),
`debugging/systematic` (4-phase + hypothesis + breaker),
`testing/verification` (completion claim gate),
`memory/learning` (lessons + observations + budgets), `skills` (registry + chain compiler).

`UnifiedBrain` exposes them via getters (`memory`, `tools`, `gateway`,
`security`, `obs`, `codebase`, `rag`) so coding and animation paths share
state, budgets, and audit trails.

## Pipelines

Human-like coding:
READ → INTENT → ARCHITECTURE → MODEL → PLAN → WRITE → RUN → DEBUG →
TEST → REVIEW → REFACTOR → VERIFY (`brain/coding/CodingBrain.ts`)

Animation:
SEE → DETECT → TRACK → TIMELINE → TRIGGERS → EASING → SPATIAL →
GRAPH → DSL → RECONSTRUCT → RENDER → COMPARE → IMPROVE
(`brain/animation/api/brain.ts`)

Autonomous code loop:
OBSERVE → UNDERSTAND → PLAN → BUILD → RUN → TEST → ANALYZE →
FIX → RETEST → REVIEW → OPTIMIZE → VERIFY (`brain/core/brain-loop.ts`)

Autonomous animation loop:
OBSERVE → UNDERSTAND → RECONSTRUCT → RENDER → COMPARE →
FIND DIFFERENCE → IMPROVE → RENDER AGAIN
(`brain/loops/animation-loop/loop.ts`)

## Migration notes

- Single source of truth: `brain/**` and `brain/animation/**`.
- Duplicate copies (`brain/ai-brain/**`, `brain/animation-brain/**`) removed.
- Old `src/ai-brain/**` and `src/animation-brain/**` shims removed;
  UI imports point directly at `brain/**`.
- New files only ADD: `brain/core/{brain,brain-loop,task-state,
  cognitive-state,orchestrator,ids,index}.ts`, `brain/schemas/*`,
  `brain/config/{brain-config,defaults,constants,index}.ts`, `brain/loops/*/loop.ts`,
  per-folder barrels (`core`, `config`, `schemas`, `models`, `memory`,
  `tools`, `reasoning`, `planner`, `rag`, `token`), `brain/index.ts`.
