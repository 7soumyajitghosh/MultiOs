// brain/config/constants.ts — single source of truth for tunables.
// All magic numbers live here so behavior can be reviewed and tuned in one place.

export const BRAIN_LIMITS = {
  /** Max chars kept from raw user goal in logs / task state. */
  goalPreviewChars: 500,
  /** Max chars of built response stored in task state. */
  buildPreviewChars: 1000,
  /** Max chars of final result re-evaluated at review. */
  reviewPreviewChars: 2000,
  /** Max chars of memory texts joined into the knowledge block. */
  knowledgeBlockChars: 6000,
  /** Max chars of the full prompt sent to the model. */
  fullPromptChars: 12000,
  /** Max chars of a tool observation stored in state. */
  toolObservationChars: 600,
  /** Max chars of a model output stored as an action. */
  modelOutputChars: 2000,
  /** Max chars of history memory items. */
  historyItemChars: 800,
  /** Max chars kept per memory record. */
  memoryRecordChars: 4000,
  /** Max observations/actions retained in cognitive state. */
  stateHistoryLimit: 50,
  /** Max tools attempted per Brain.run call. */
  maxToolsPerRun: 3,
  /** Max planned subtasks surfaced per run. */
  maxPlannedSubtasks: 4,
  /** Max subtasks produced by the planner. */
  maxSubtasks: 10,
  /** Default retry budget for autonomous loops. */
  defaultMaxAttempts: 3,
  /** Default max steps for Brain.run when not specified. */
  defaultMaxSteps: 12,
} as const;

export const BRAIN_MODEL_DEFAULTS = {
  /** Temperature for complex tasks (more deterministic). */
  complexTemperature: 0.4,
  /** Temperature for simple/medium tasks. */
  defaultTemperature: 0.6,
  /** Confidence below which an uncertainty note is appended to the prompt. */
  lowConfidenceThreshold: 0.4,
  /** Minimum revision text length to accept a revision pass. */
  minRevisionChars: 20,
  /** Minimum final text length worth persisting to episodic memory. */
  minMemoryChars: 50,
} as const;

export const BRAIN_MEMORY_TUNING = {
  relevanceWeight: 0.55,
  recencyWeight: 0.15,
  importanceWeight: 0.2,
  taskOverlapWeight: 0.1,
  /** 3-day recency decay horizon (hours). */
  recencyDecayHours: 72,
  minScore: 0.05,
  topMemoriesInPrompt: 5,
} as const;

export const BRAIN_SECURITY_LIMITS = {
  rateLimitPerMinute: 30,
  rateWindowMs: 60_000,
  maxSerializedChars: 500,
} as const;

export const ANIMATION_TUNING = {
  /** Target visual similarity score (0-100) for the animation loop. */
  targetSimilarity: 85,
} as const;
