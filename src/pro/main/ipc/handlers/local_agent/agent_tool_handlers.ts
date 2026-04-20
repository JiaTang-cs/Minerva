/**
 * IPC handlers for agent tool consent management
 */

import {
  getAllAgentToolConsents,
  setAgentToolConsent,
  resolveAgentToolConsent,
  TOOL_DEFINITIONS,
  getDefaultConsent,
  type AgentToolName,
} from "./tool_definitions";
import {
  emitSubagentTaskKilled,
  killSubagentTask,
  listSubagentTasksForChat,
  updateSubagentTask,
} from "./subagents/task_state";
import { createLoggedHandler } from "@/ipc/handlers/safe_handle";
import log from "electron-log";
import type {
  AgentTool,
  SetAgentToolConsentParams,
  AgentToolConsentResponseParams,
} from "@/ipc/types";

const logger = log.scope("agent_tool_handlers");
const handle = createLoggedHandler(logger);
export function registerAgentToolHandlers() {
  // Get list of available tools with their consent settings
  handle("agent-tool:get-tools", async (): Promise<AgentTool[]> => {
    const consents = getAllAgentToolConsents();
    return TOOL_DEFINITIONS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      isAllowedByDefault: getDefaultConsent(tool.name) === "always",
      consent: consents[tool.name],
    }));
  });

  // Set consent for a single tool
  handle(
    "agent-tool:set-consent",
    async (_event, params: SetAgentToolConsentParams) => {
      setAgentToolConsent(params.toolName as AgentToolName, params.consent);
      return { success: true };
    },
  );

  // Handle consent response from renderer
  handle(
    "agent-tool:consent-response",
    async (_event, params: AgentToolConsentResponseParams) => {
      resolveAgentToolConsent(params.requestId, params.decision);
    },
  );

  handle("agent-tool:get-subagent-tasks", async (_event, { chatId }) => {
    return listSubagentTasksForChat(chatId);
  });

  handle("agent-tool:stop-subagent-task", async (_event, { taskId }) => {
    const stopped = killSubagentTask(taskId);
    if (stopped) {
      const updated = updateSubagentTask(taskId, (current) => ({
        ...current,
        status: "killed",
        activeToolName: null,
        updatedAt: Date.now(),
      }));
      if (updated) {
        emitSubagentTaskKilled(_event.sender, updated);
      }
    }
    return stopped;
  });
}
