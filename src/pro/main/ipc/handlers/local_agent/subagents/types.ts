import type { AgentContext, ToolDefinition } from "../tools/types";

export type SubagentSource = "built-in" | "custom";

export interface BuiltInSubagentPromptParams {
  parentMode: "ask" | "plan" | "design" | "build";
}

export interface SubagentDefinition {
  name: string;
  description: string;
  source: SubagentSource;
  model?: "inherit" | string;
  tools?: string[];
  disallowedTools?: string[];
  location?: string;
  filePath?: string;
  getSystemPrompt: (params: BuiltInSubagentPromptParams) => string;
}

export interface SubagentLoadError {
  path: string;
  error: string;
}

export interface ResolveSubagentToolsOptions {
  availableToolDefinitions: readonly ToolDefinition[];
  readOnly?: boolean;
  planModeOnly?: boolean;
  designModeOnly?: boolean;
  background?: boolean;
}

export interface ResolvedSubagentTools {
  toolNames: string[];
  invalidTools: string[];
}

export interface SubagentRunCallbacks {
  onActiveToolChange?: (toolName: string | null) => void;
}

export interface SubagentRunParams {
  definition: SubagentDefinition;
  prompt: string;
  description: string;
  ctx: AgentContext;
  abortController: AbortController;
  background?: boolean;
  callbacks?: SubagentRunCallbacks;
}

export interface SubagentRunResult {
  content: string;
  toolUseCount: number;
  durationMs: number;
}
