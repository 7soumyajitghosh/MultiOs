import type { MemoryQuery, MemoryRecord, MemoryScope, RankedMemory } from "../core/types";
import type { CompactIndexEntry } from "./learning/index";
import { uid } from "../core/ids";
import { BRAIN_LIMITS, BRAIN_MEMORY_TUNING } from "../config/constants";
import { HashEmbeddingProvider, cosineSimilarity, type EmbeddingProvider } from "./embeddings";

export interface MemoryProvider {
  save(record: MemoryRecord): Promise<void> | void;
  search(queryEmbedding: number[], scopes: MemoryScope[] | undefined, topK: number): Promise<MemoryRecord[]> | MemoryRecord[];
  delete(id: string): Promise<boolean> | boolean;
  clear(scope?: MemoryScope): Promise<void> | void;
  count(): number;
  all(): MemoryRecord[];
}

export class InMemoryVectorProvider implements MemoryProvider {
  private store = new Map<string, MemoryRecord>();
  save(record: MemoryRecord): void { this.store.set(record.id, record); }
  search(queryEmbedding: number[], scopes: MemoryScope[] | undefined, topK: number): MemoryRecord[] {
    const all = [...this.store.values()].filter((r) => !scopes?.length || scopes.includes(r.scope));
    return all
      .map((r) => ({ r, sim: cosineSimilarity(queryEmbedding, r.embedding) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, topK)
      .map((x) => x.r);
  }
  delete(id: string): boolean { return this.store.delete(id); }
  clear(scope?: MemoryScope): void {
    if (!scope) this.store.clear();
    else for (const [k, v] of this.store) if (v.scope === scope) this.store.delete(k);
  }
  count(): number { return this.store.size; }
  all(): MemoryRecord[] { return [...this.store.values()]; }
}

function matchesFilter(r: MemoryRecord, filter?: Record<string, unknown>): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([k, v]) => r.metadata[k] === v);
}

// Ranking: relevance (vector sim) + recency + importance + task relationship (metadata overlap)
export class MemoryManager {
  constructor(
    private provider: MemoryProvider = new InMemoryVectorProvider(),
    private embedder: EmbeddingProvider = new HashEmbeddingProvider(),
  ) {}

  async remember(content: string, scope: MemoryScope = "episodic", opts: { importance?: number; metadata?: Record<string, unknown> } = {}): Promise<MemoryRecord> {
    const embedding = await this.embedder.embed(content);
    const record: MemoryRecord = {
      id: uid("mem"),
      scope,
      content: content.slice(0, BRAIN_LIMITS.memoryRecordChars),
      embedding,
      metadata: opts.metadata ?? {},
      importance: opts.importance ?? 0.5,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
    };
    await this.provider.save(record);
    return record;
  }

  async retrieve(query: string, topK = 6): Promise<RankedMemory[]> {
    return this.search({ text: query, topK });
  }

  /**
   * Layer-1 progressive disclosure (claude-mem style): compact index entries
   * (~50-100 tokens each) without full content. Fetch full details only for
   * relevant ids via search(). ~10x token savings on large recalls.
   */
  async searchIndex(q: MemoryQuery): Promise<CompactIndexEntry[]> {
    const ranked = await this.search(q);
    return ranked.map((r) => ({
      id: r.id,
      scope: r.scope,
      preview: r.content.replace(/\s+/g, " ").trim().slice(0, 160),
      importance: r.importance,
      score: Math.round(r.score * 1000) / 1000,
      createdAt: r.createdAt,
    }));
  }

  async search(q: MemoryQuery): Promise<RankedMemory[]> {
    const topK = q.topK ?? 6;
    const qEmb = await this.embedder.embed(q.text);
    const candidates = await this.provider.search(qEmb, q.scopes, Math.max(topK * 3, topK));
    const now = Date.now();
    const qTokens = new Set(q.text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
    const ranked: RankedMemory[] = candidates
      .filter((r) => matchesFilter(r, q.metadataFilter))
      .map((r) => {
        const relevance = cosineSimilarity(qEmb, r.embedding);
        const ageHrs = (now - r.createdAt) / 3_600_000;
        const recency = Math.exp(-ageHrs / BRAIN_MEMORY_TUNING.recencyDecayHours);
        const rTokens = new Set(r.content.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
        let overlap = 0;
        for (const t of qTokens) if (rTokens.has(t)) overlap++;
        const taskRel = qTokens.size ? overlap / qTokens.size : 0;
        const score =
          BRAIN_MEMORY_TUNING.relevanceWeight * relevance +
          BRAIN_MEMORY_TUNING.recencyWeight * recency +
          BRAIN_MEMORY_TUNING.importanceWeight * r.importance +
          BRAIN_MEMORY_TUNING.taskOverlapWeight * taskRel;
        return { ...r, score };
      })
      .filter((r) => r.score >= (q.minScore ?? BRAIN_MEMORY_TUNING.minScore))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    for (const r of ranked) {
      r.lastAccessedAt = now;
      r.accessCount += 1;
      await this.provider.save(r);
    }
    return ranked;
  }

  async forget(id: string): Promise<boolean> { return this.provider.delete(id); }
  async summarize(scope?: MemoryScope): Promise<string> {
    const all = this.provider.all().filter((r) => !scope || r.scope === scope);
    if (!all.length) return "No memories stored.";
    const top = [...all].sort((a, b) => b.importance - a.importance).slice(0, 10);
    return top.map((r, i) => `${i + 1}. [${r.scope}] ${r.content.slice(0, 160)}`).join("\n");
  }

  async update(id: string, patch: Partial<Pick<MemoryRecord, "content" | "importance" | "metadata">>): Promise<MemoryRecord | null> {
    const found = this.provider.all().find((r) => r.id === id);
    if (!found) return null;
    if (patch.content) found.embedding = await this.embedder.embed(patch.content);
    const next = { ...found, ...patch, lastAccessedAt: Date.now() };
    await this.provider.save(next);
    return next;
  }

  count(): number { return this.provider.count(); }
}
