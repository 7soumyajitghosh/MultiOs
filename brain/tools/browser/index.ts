// brain/tools/browser/index.ts — browser automation tool contract.
// Real browser control must be injected by the host; this barrel defines
// the input shape so planners can request browser actions safely.

export interface BrowserToolInput {
  action: "open" | "snapshot" | "act" | "close";
  url?: string;
  instruction?: string;
}

export const BROWSER_TOOL_NAME = "browser" as const;

