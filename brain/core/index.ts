// brain/core/index.ts — single barrel for core (avoids deep imports).
export * from "./types";
export * from "./task-state";
export * from "./cognitive-state";
export * from "./ids";
export { Brain, type BrainDeps } from "./brain/Brain";
export { UnifiedBrain, getUnifiedBrain, createUnifiedBrain } from "./brain";
export { BrainOrchestrator, getOrchestrator, routeCapability } from "./orchestrator";
export { runBrainLoop, type LoopOptions } from "./brain-loop";
