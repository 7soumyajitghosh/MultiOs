// brain/memory/index.ts — single barrel for memory.
export { MemoryManager, InMemoryVectorProvider, type MemoryProvider } from "./MemoryManager";
export * from "./embeddings";
export {
  extractLessons, summarizeSession, toPreview,
  shouldSkipObservation, stripPrivate, estimateObservationTokens, fitContextBudget,
  type Lesson, type SessionOutcome, type CompactIndexEntry, type ObservationKind,
  type ObservationRecord, type ObservationType, type ObservationConcept,
} from "./learning/index";
