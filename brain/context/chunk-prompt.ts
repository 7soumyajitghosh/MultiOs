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

// Chunk text into overlapping windows of maxTokens tokens each.
// Useful for processing long contexts in batches (e.g. when context limit is reached).
export function* chunkText(text: string, maxTokens: number, overlapTokens = 0): Generator<string> {
  if (maxTokens <= 0) throw new Error("maxTokens must be > 0");
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  let start = 0;
  const textLen = text.length;
  while (start < textLen) {
    const end = Math.min(start + maxChars, textLen);
    yield text.slice(start, end);
    start += maxChars - overlapTokens;
    if (start <= 0) start = 0; // prevent infinite loop when overlap >= maxTokens
  }
}

// Chunk text by sentence boundaries for more coherent windows.
// Falls back to character-based chunking if sentence detection fails.
export function chunkTextBySentences(text: string, maxTokens: number, overlapTokens = 0): string[] {
  const maxChars = maxTokens * 4;
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let buffer = "";
  let bufferChars = 0;

  for (const para of paragraphs) {
    const paraSentences = para.split(/(?<=[.!?])\s+/);
    for (const sentence of paraSentences) {
      const sentenceEst = estimateTokens(sentence);
      if (bufferChars + sentenceEst > maxChars && buffer) {
        chunks.push(buffer.trim());
        // overlap: keep last ~overlapTokens from buffer
        const overlapWords = buffer.trim().split(/\s+/).slice(-Math.max(1, overlapTokens));
        buffer = overlapWords.join(" ") + " " + sentence;
        bufferChars = estimateTokens(buffer);
      } else {
        buffer = (buffer + " " + sentence).trim();
        bufferChars += sentenceEst;
      }
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks;
}