import { safeSend } from "@/ipc/utils/safe_sender";
import type { WebContents } from "electron";

export type SubagentTaskStatus = "running" | "completed" | "failed" | "killed";

export interface SubagentTaskRecord {
  taskId: string;
  chatId: number;
  appId: number;
  subagent: string;
  description: string;
  toolUseId?: string;
  status: SubagentTaskStatus;
  activeToolName?: string | null;
  output?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const tasks = new Map<string, SubagentTaskRecord>();
const taskAbortControllers = new Map<string, AbortController>();

function cloneTask(task: SubagentTaskRecord): SubagentTaskRecord {
  return { ...task };
}

export function registerSubagentTask(
  task: SubagentTaskRecord,
  abortController: AbortController,
): void {
  tasks.set(task.taskId, task);
  taskAbortControllers.set(task.taskId, abortController);
}

export function getSubagentTask(
  taskId: string,
): SubagentTaskRecord | undefined {
  const task = tasks.get(taskId);
  return task ? cloneTask(task) : undefined;
}

export function listSubagentTasksForChat(chatId: number): SubagentTaskRecord[] {
  return [...tasks.values()]
    .filter((task) => task.chatId === chatId)
    .map(cloneTask);
}

export function updateSubagentTask(
  taskId: string,
  updater: (task: SubagentTaskRecord) => SubagentTaskRecord,
): SubagentTaskRecord | undefined {
  const existing = tasks.get(taskId);
  if (!existing) return undefined;
  const updated = updater(existing);
  tasks.set(taskId, updated);
  if (updated.status !== "running") {
    taskAbortControllers.delete(taskId);
  }
  return cloneTask(updated);
}

export function killSubagentTask(taskId: string): boolean {
  const controller = taskAbortControllers.get(taskId);
  if (!controller) return false;
  controller.abort();
  return true;
}

export function emitSubagentTaskCreated(
  sender: WebContents,
  task: SubagentTaskRecord,
): void {
  safeSend(sender, "agent-tool:subagent-task-created", task);
}

export function emitSubagentTaskProgress(
  sender: WebContents,
  task: SubagentTaskRecord,
): void {
  safeSend(sender, "agent-tool:subagent-task-progress", task);
}

export function emitSubagentTaskCompleted(
  sender: WebContents,
  task: SubagentTaskRecord,
): void {
  safeSend(sender, "agent-tool:subagent-task-completed", task);
}

export function emitSubagentTaskFailed(
  sender: WebContents,
  task: SubagentTaskRecord,
): void {
  safeSend(sender, "agent-tool:subagent-task-failed", task);
}

export function emitSubagentTaskKilled(
  sender: WebContents,
  task: SubagentTaskRecord,
): void {
  safeSend(sender, "agent-tool:subagent-task-killed", task);
}

export function createRunningSubagentTask(args: {
  taskId: string;
  chatId: number;
  appId: number;
  subagent: string;
  description: string;
  toolUseId?: string;
}): SubagentTaskRecord {
  const now = Date.now();
  return {
    ...args,
    status: "running",
    createdAt: now,
    updatedAt: now,
    activeToolName: null,
  };
}
