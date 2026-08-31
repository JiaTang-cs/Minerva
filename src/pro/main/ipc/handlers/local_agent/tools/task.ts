import crypto from "node:crypto";
import { z } from "zod";
import {
  escapeXmlAttr,
  escapeXmlContent,
  type AgentContext,
  type ToolDefinition,
} from "./types";
import { resolveSubagentByName } from "../subagents/registry";
import { runSubagentStream } from "../subagents/runner";
import {
  createRunningSubagentTask,
  emitSubagentTaskCompleted,
  emitSubagentTaskCreated,
  emitSubagentTaskFailed,
  emitSubagentTaskKilled,
  emitSubagentTaskProgress,
  getSubagentTask,
  registerSubagentTask,
  updateSubagentTask,
} from "../subagents/task_state";
import { setSubagentTaskOutput } from "../subagents/task_output";

const taskSchema = z.object({
  subagent: z.string().min(1).describe("The subagent name to run"),
  description: z
    .string()
    .min(1)
    .describe("A short description of the delegated task"),
  prompt: z.string().min(1).describe("The delegated task prompt"),
  runInBackground: z
    .boolean()
    .optional()
    .describe("Whether to continue running this subagent in the background"),
});

function buildTaskCallXml(args: {
  subagent: string;
  description: string;
  state: "launching" | "running" | "background";
  activeTool?: string | null;
}): string {
  const attrs = [
    `subagent="${escapeXmlAttr(args.subagent)}"`,
    `description="${escapeXmlAttr(args.description)}"`,
    `state="${escapeXmlAttr(args.state)}"`,
  ];
  if (args.activeTool) {
    attrs.push(`active-tool="${escapeXmlAttr(args.activeTool)}"`);
  }
  const body =
    args.state === "background"
      ? "Running in background."
      : args.activeTool
        ? `Active tool: ${args.activeTool}`
        : "Preparing subagent...";
  return `<dyad-subagent-call ${attrs.join(" ")}>${escapeXmlContent(body)}</dyad-subagent-call>`;
}

function buildTaskResultXml(args: {
  subagent: string;
  description: string;
  status: "completed" | "async_launched" | "failed" | "killed";
  taskId?: string;
  toolUseCount?: number;
  durationMs?: number;
  content?: string;
}): string {
  const attrs = [
    `subagent="${escapeXmlAttr(args.subagent)}"`,
    `description="${escapeXmlAttr(args.description)}"`,
    `status="${escapeXmlAttr(args.status)}"`,
  ];
  if (args.taskId) attrs.push(`task-id="${escapeXmlAttr(args.taskId)}"`);
  if (typeof args.toolUseCount === "number") {
    attrs.push(`tool-uses="${args.toolUseCount}"`);
  }
  if (typeof args.durationMs === "number") {
    attrs.push(`duration-ms="${args.durationMs}"`);
  }
  return `<dyad-subagent-result ${attrs.join(" ")}>${escapeXmlContent(args.content ?? "")}</dyad-subagent-result>`;
}

export const taskTool: ToolDefinition<z.infer<typeof taskSchema>> = {
  name: "task",
  description: `Delegate work to a specialized subagent.

- Supports built-in subagents like \`worker\` and \`explore\`
- Supports custom app-local subagents from \`.minerva/agents/*.md\`
- Can run in the foreground or background
- A subagent always inherits and narrows the current mode's tool permissions
- Subagents cannot recursively spawn other subagents`,
  inputSchema: taskSchema,
  defaultConsent: "always",

  getConsentPreview: (args) =>
    `Delegate "${args.description}" to subagent "${args.subagent}"`,

  buildXml: (args, isComplete) => {
    if (!args.subagent || !args.description || isComplete) {
      return undefined;
    }
    return buildTaskCallXml({
      subagent: args.subagent,
      description: args.description,
      state: args.runInBackground ? "background" : "launching",
    });
  },

  execute: async (args, ctx: AgentContext) => {
    const { subagent, failedFiles } = await resolveSubagentByName(
      ctx.appPath,
      args.subagent,
    );

    for (const failedFile of failedFiles) {
      ctx.onWarningMessage?.(
        `Subagent file ignored: ${failedFile.path} (${failedFile.error})`,
      );
    }

    if (args.runInBackground) {
      const taskId = `subagent_${crypto.randomUUID()}`;
      const abortController = new AbortController();
      const task = createRunningSubagentTask({
        taskId,
        chatId: ctx.chatId,
        appId: ctx.appId,
        subagent: subagent.name,
        description: args.description,
      });
      registerSubagentTask(task, abortController);
      emitSubagentTaskCreated(ctx.event.sender, task);
      ctx.onXmlComplete(
        buildTaskResultXml({
          subagent: subagent.name,
          description: args.description,
          status: "async_launched",
          taskId,
          content: `Launched background subagent ${subagent.name}.`,
        }),
      );

      void runSubagentStream({
        definition: subagent,
        prompt: args.prompt,
        description: args.description,
        ctx,
        abortController,
        background: true,
        callbacks: {
          onActiveToolChange: (toolName) => {
            const updated = updateSubagentTask(taskId, (current) => ({
              ...current,
              activeToolName: toolName,
              updatedAt: Date.now(),
            }));
            if (updated) {
              emitSubagentTaskProgress(ctx.event.sender, updated);
            }
          },
        },
      })
        .then((result) => {
          const currentTask = getSubagentTask(taskId);
          if (!currentTask || currentTask.status !== "running") {
            return;
          }
          setSubagentTaskOutput(taskId, result.content);
          const updated = updateSubagentTask(taskId, (current) => ({
            ...current,
            status: "completed",
            activeToolName: null,
            output: result.content,
            updatedAt: Date.now(),
          }));
          if (updated) {
            emitSubagentTaskCompleted(ctx.event.sender, updated);
          }
        })
        .catch((error) => {
          const currentTask = getSubagentTask(taskId);
          if (!currentTask || currentTask.status !== "running") {
            return;
          }
          const message =
            error instanceof Error ? error.message : String(error);
          const status = abortController.signal.aborted ? "killed" : "failed";
          const updated = updateSubagentTask(taskId, (current) => ({
            ...current,
            status,
            activeToolName: null,
            error: message,
            updatedAt: Date.now(),
          }));
          if (updated) {
            if (status === "killed") {
              emitSubagentTaskKilled(ctx.event.sender, updated);
            } else {
              emitSubagentTaskFailed(ctx.event.sender, updated);
            }
          }
        });

      return JSON.stringify({
        status: "async_launched",
        taskId,
        subagent: subagent.name,
        description: args.description,
      });
    }

    ctx.onXmlStream(
      buildTaskCallXml({
        subagent: subagent.name,
        description: args.description,
        state: "running",
      }),
    );

    const result = await runSubagentStream({
      definition: subagent,
      prompt: args.prompt,
      description: args.description,
      ctx,
      abortController: new AbortController(),
      callbacks: {
        onActiveToolChange: (toolName) => {
          ctx.onXmlStream(
            buildTaskCallXml({
              subagent: subagent.name,
              description: args.description,
              state: "running",
              activeTool: toolName,
            }),
          );
        },
      },
    });

    ctx.onXmlComplete(
      buildTaskResultXml({
        subagent: subagent.name,
        description: args.description,
        status: "completed",
        toolUseCount: result.toolUseCount,
        durationMs: result.durationMs,
      }),
    );

    return JSON.stringify({
      status: "completed",
      subagent: subagent.name,
      content: result.content,
      toolUseCount: result.toolUseCount,
      durationMs: result.durationMs,
    });
  },
};
