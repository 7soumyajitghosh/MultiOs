// brain/core/ids.ts — collision-free, sortable ID generation.
// Uses crypto.randomUUID when available, falls back to a monotonic counter.

let seq = 0;

function randomSuffix(): string {
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c?.randomUUID) return c.randomUUID().slice(0, 8);
  } catch {
    // fall through to counter-based suffix below
  }
  seq += 1;
  return `${Date.now().toString(36)}_${seq.toString(36)}`;
}

/** Generate a unique ID with the given prefix. */
export function uid(prefix: string): string {
  return `${prefix}_${randomSuffix()}`;
}

/** Reset the fallback counter (tests only). */
export function __resetIdCounterForTests(): void {
  seq = 0;
}
