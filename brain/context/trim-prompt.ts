// Cheap deterministic tokenizer: ~1 token per 4 chars, min 1. No external dep.
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

// Truncate text to a given number of tokens (preserve whole words when possible).
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  // slice to maxChars and trim trailing partial word, then add ellipsis
  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  return lastSpace >= 0 ? slice.slice(0, lastSpace) + "\n…[truncated]" : slice + "\n…[truncated]";
}