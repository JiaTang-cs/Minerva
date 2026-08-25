import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { getInternalAppSubdirPath } from "@/ipc/utils/internal_app_dir";
import { BUILT_IN_SUBAGENTS } from "./built-in";
import { parseMarkdownFrontmatter } from "./frontmatter";
import type {
  ResolvedSubagentTools,
  ResolveSubagentToolsOptions,
  SubagentDefinition,
  SubagentLoadError,
} from "./types";

const CustomSubagentFrontmatterSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    model: z.string().optional(),
    tools: z.array(z.string()).optional(),
    disallowedTools: z.array(z.string()).optional(),
    location: z.string().optional(),
  })
  .strict();

const BACKGROUND_UNSAFE_TOOL_NAMES = new Set([
  "planning_questionnaire",
  "ask_user_question",
  "exit_plan",
  "exit_design",
]);

function getParentMode(options: ResolveSubagentToolsOptions): "ask" | "plan" | "design" | "build" {
  if (options.readOnly) return "ask";
  if (options.planModeOnly) return "plan";
  if (options.designModeOnly) return "design";
  return "build";
}

export async function loadSubagentRegistry(appPath: string): Promise<{
  activeSubagents: SubagentDefinition[];
  failedFiles: SubagentLoadError[];
}> {
  const subagentMap = new Map<string, SubagentDefinition>();
  for (const builtIn of BUILT_IN_SUBAGENTS) {
    subagentMap.set(builtIn.name, builtIn);
  }

  const failedFiles: SubagentLoadError[] = [];
  const agentsDir = getInternalAppSubdirPath(appPath, "agents");

  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      const filePath = path.join(agentsDir, entry.name);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const { frontmatter, body } = parseMarkdownFrontmatter(content);
        const parsed = CustomSubagentFrontmatterSchema.safeParse(frontmatter);
        if (!parsed.success) {
          failedFiles.push({
            path: filePath,
            error: parsed.error.issues.map((issue) => issue.message).join("; "),
          });
          continue;
        }

        const promptBody = body.trim();
        if (!promptBody) {
          failedFiles.push({
            path: filePath,
            error: "Custom subagent body cannot be empty",
          });
          continue;
        }

        const model = parsed.data.model?.trim();
        subagentMap.set(parsed.data.name, {
          name: parsed.data.name,
          description: parsed.data.description,
          source: "custom",
          model: model ? (model === "inherit" ? "inherit" : model) : "inherit",
          tools: parsed.data.tools,
          disallowedTools: parsed.data.disallowedTools,
          location: parsed.data.location ?? "app",
          filePath,
          getSystemPrompt: () => promptBody,
        });
      } catch (error) {
        failedFiles.push({
          path: filePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
      failedFiles.push({
        path: agentsDir,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    activeSubagents: [...subagentMap.values()],
    failedFiles,
  };
}

export async function resolveSubagentByName(
  appPath: string,
  name: string,
): Promise<{
  subagent: SubagentDefinition;
  failedFiles: SubagentLoadError[];
}> {
  const registry = await loadSubagentRegistry(appPath);
  const subagent = registry.activeSubagents.find((entry) => entry.name === name);
  if (!subagent) {
    throw new DyadError(
      `Subagent not found: ${name}`,
      DyadErrorKind.NotFound,
    );
  }
  return { subagent, failedFiles: registry.failedFiles };
}

export function resolveSubagentTools(
  definition: SubagentDefinition,
  options: ResolveSubagentToolsOptions,
): ResolvedSubagentTools {
  const availableNames = options.availableToolDefinitions
    .filter((tool) => {
      if (tool.name === "task") {
        return false;
      }
      if (definition.name === "explore" && tool.modifiesState) {
        return false;
      }
      if (options.background && BACKGROUND_UNSAFE_TOOL_NAMES.has(tool.name)) {
        return false;
      }
      return true;
    })
    .map((tool) => tool.name);

  const availableSet = new Set(availableNames);
  let effective = definition.tools
    ? definition.tools.filter((toolName) => availableSet.has(toolName))
    : availableNames;

  const invalidTools = definition.tools
    ? definition.tools.filter((toolName) => !availableSet.has(toolName))
    : [];

  if (definition.disallowedTools?.length) {
    const disallowed = new Set(definition.disallowedTools);
    effective = effective.filter((toolName) => !disallowed.has(toolName));
  }

  return {
    toolNames: [...new Set(effective)],
    invalidTools,
  };
}

export function getSubagentSystemPrompt(
  definition: SubagentDefinition,
  options: ResolveSubagentToolsOptions,
): string {
  const parentMode = getParentMode(options);
  const header = `You are a delegated subagent inside Minerva.\nYou are working for a parent agent and your raw transcript is not shown directly to the user.`;
  const guardrails = `\n\nGlobal rules:\n- You must not recursively delegate or attempt to call the task tool.\n- Work only within the tools available in this run.\n- Keep your final answer concise and handoff-oriented.\n- Do not claim work you did not actually complete.`;
  return `${header}${guardrails}\n\n${definition.getSystemPrompt({ parentMode })}`;
}
