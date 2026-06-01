import { stepCountIs, streamText } from "ai";
import { MinervaError, MinervaErrorKind } from "@/errors/dyad_error";
import { readSettings } from "@/main/settings";
import { getModelClient } from "@/ipc/utils/get_model_client";
import { getProviderOptions, getAiHeaders, DYAD_INTERNAL_REQUEST_ID_HEADER } from "@/ipc/utils/provider_options";
import { getMaxTokens, getTemperature } from "@/ipc/utils/token_utils";
import { getSubagentSystemPrompt, resolveSubagentTools } from "./registry";
import type { SubagentRunParams, SubagentRunResult } from "./types";
import { buildAgentToolSet, TOOL_DEFINITIONS } from "../tool_definitions";

const SUBAGENT_MAX_STEPS = 20;

export async function runSubagentStream(
  params: SubagentRunParams,
): Promise<SubagentRunResult> {
  const { definition, prompt, ctx, abortController, callbacks, background } =
    params;
  const settings = readSettings();
  const resolved = resolveSubagentTools(definition, {
    availableToolDefinitions: TOOL_DEFINITIONS,
    readOnly: ctx.readOnly,
    planModeOnly: ctx.planModeOnly,
    designModeOnly: ctx.designModeOnly,
    background,
  });

  if (resolved.toolNames.length === 0) {
    throw new MinervaError(
      `Subagent '${definition.name}' has no available tools in this mode.`,
      MinervaErrorKind.Precondition,
    );
  }

  const selectedModel =
    definition.model && definition.model !== "inherit"
      ? { ...settings.selectedModel, name: definition.model }
      : settings.selectedModel;
  const { modelClient } = await getModelClient(selectedModel, settings);

  const maxOutputTokens = await getMaxTokens(settings.selectedModel);
  const temperature = await getTemperature(settings.selectedModel);
  const childContext = {
    ...ctx,
    onXmlStream: () => {},
    onXmlComplete: () => {},
    appendUserMessage: () => {},
    onUpdateTodos: () => {},
  };
  const toolSet = buildAgentToolSet(childContext, {
    readOnly: ctx.readOnly || definition.name === "explore",
    planModeOnly: ctx.planModeOnly,
    designModeOnly: ctx.designModeOnly,
    includeOnlyToolNames: new Set(resolved.toolNames),
    excludeToolNames: new Set(["task"]),
  });

  let activeToolName: string | null = null;
  let responseText = "";
  let toolUseCount = 0;
  const startedAt = Date.now();

  const streamResult = streamText({
    model: modelClient.model,
    headers: {
      ...getAiHeaders({
        builtinProviderId: modelClient.builtinProviderId,
      }),
      [DYAD_INTERNAL_REQUEST_ID_HEADER]: ctx.dyadRequestId,
    },
    providerOptions: getProviderOptions({
      dyadAppId: ctx.appId,
      dyadRequestId: ctx.dyadRequestId,
      dyadDisableFiles: true,
      files: [],
      mentionedAppsCodebases: [],
      builtinProviderId: modelClient.builtinProviderId,
      settings,
    }),
    maxOutputTokens,
    temperature,
    system: getSubagentSystemPrompt(definition, {
    availableToolDefinitions: TOOL_DEFINITIONS,
    readOnly: ctx.readOnly,
    planModeOnly: ctx.planModeOnly,
    designModeOnly: ctx.designModeOnly,
    background,
  }),
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt }],
      },
    ],
    tools: toolSet,
    stopWhen: [stepCountIs(SUBAGENT_MAX_STEPS)],
    abortSignal: abortController.signal,
  });

  for await (const part of streamResult.fullStream) {
    if (part.type === "text-delta") {
      responseText += part.text;
    } else if (part.type === "tool-input-start") {
      activeToolName = part.toolName;
      toolUseCount += 1;
      callbacks?.onActiveToolChange?.(activeToolName);
    } else if (part.type === "tool-result") {
      callbacks?.onActiveToolChange?.(activeToolName);
    }
  }

  callbacks?.onActiveToolChange?.(null);
  return {
    content: responseText.trim(),
    toolUseCount,
    durationMs: Date.now() - startedAt,
  };
}
