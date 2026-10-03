import type { ToolCallResult, ToolDefinition } from "../core/types";

export interface ToolHandler {
  definition: ToolDefinition;
  execute(input: unknown): Promise<unknown>;
}

type AnyRecord = Record<string, unknown>;

/** Safely read a string field from unknown tool input. */
function strField(input: unknown, key: string, maxChars = 2000): string {
  if (typeof input === "string") return input.slice(0, maxChars);
  if (input && typeof input === "object") {
    const v = (input as AnyRecord)[key];
    if (typeof v === "string") return v.slice(0, maxChars);
    if (v !== undefined) return String(v).slice(0, maxChars);
  }
  return "";
}

export class ToolRegistry {
  private tools = new Map<string, ToolHandler>();

  register(handler: ToolHandler): void { this.tools.set(handler.definition.name, handler); }
  get(name: string): ToolHandler | undefined { return this.tools.get(name); }
  list(): ToolDefinition[] { return [...this.tools.values()].map((t) => t.definition); }
  names(): string[] { return [...this.tools.keys()]; }

  async call(name: string, input: unknown): Promise<ToolCallResult> {
    const start = Date.now();
    const tool = this.tools.get(name);
    if (!tool) return { toolName: name, success: false, output: null, latencyMs: 0, error: `Unknown tool: ${name}` };
    try {
      const output = await tool.execute(input);
      return { toolName: name, success: true, output, latencyMs: Date.now() - start };
    } catch (e) {
      return { toolName: name, success: false, output: null, latencyMs: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

// ---- Built-in safe tools (no network secrets, sandboxed) ----

export function builtinTools(): ToolHandler[] {
  return [
    {
      definition: {
        name: "web_search",
        description: "Search the web (stub: returns query plan; plug a real provider via WEB_SEARCH_API_KEY).",
        capabilities: ["research", "latest-info"],
        inputSchema: { query: "string" },
        outputSchema: { results: "array" },
        riskLevel: "low",
      },
      async execute(input: unknown) {
        const q = strField(input, "query", 200);
        const apiKey = (typeof process !== "undefined" ? process.env?.WEB_SEARCH_API_KEY : undefined) as string | undefined;
        if (!apiKey) {
          return { results: [], note: `No WEB_SEARCH_API_KEY configured. Search plan for: ${String(q).slice(0, 200)}` };
        }
        return { results: [], note: "Provider integration point — implement fetch here." };
      },
    },
    {
      definition: {
        name: "filesystem",
        description: "Describe a file operation plan. Real FS access must be granted explicitly by the host.",
        capabilities: ["read", "list"],
        inputSchema: { path: "string", operation: "string" },
        outputSchema: { plan: "string" },
        riskLevel: "medium",
      },
      async execute(input: unknown) {
        const r = (input ?? {}) as AnyRecord;
        const operation = typeof r.operation === "string" ? r.operation.slice(0, 32) : "read";
        const path = typeof r.path === "string" ? r.path.slice(0, 512) : ".";
        return { plan: `Filesystem ${operation} on ${path} — host must approve medium-risk tools.` };
      },
    },
    {
      definition: {
        name: "code_execution",
        description: "Safe arithmetic/code evaluation sandbox (math expressions only).",
        capabilities: ["compute"],
        inputSchema: { expression: "string" },
        outputSchema: { value: "number|string" },
        riskLevel: "medium",
      },
      async execute(input: unknown) {
        const expr = strField(input, "expression", 200);
        if (!/^[0-9+\-*/().\s%^]+$/.test(expr) || !expr.trim()) throw new Error("Only numeric expressions allowed in sandbox.");
        // eslint-disable-next-line no-new-func
        const value = Function(`"use strict"; return (${expr})`)() as unknown;
        if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Expression did not evaluate to a finite number.");
        return { value };
      },
    },
    {
      definition: {
        name: "document_processing",
        description: "Extract/summarize pasted document text.",
        capabilities: ["summarize", "extract"],
        inputSchema: { text: "string" },
        outputSchema: { summary: "string" },
        riskLevel: "low",
      },
      async execute(input: unknown) {
        const text = strField(input, "text", 20000);
        const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 5);
        return { summary: sentences.join(" ").slice(0, 1500), chars: text.length };
      },
    },
  ];
}
