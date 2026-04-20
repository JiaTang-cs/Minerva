import { describe, expect, it } from "vitest";
import {
  createRunningSubagentTask,
  getSubagentTask,
  killSubagentTask,
  listSubagentTasksForChat,
  registerSubagentTask,
  updateSubagentTask,
} from "./task_state";

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe("subagent task state", () => {
  it("registers and lists background tasks by chat", () => {
    const taskId = uniqueId("task");
    const chatId = Math.floor(Math.random() * 1_000_000);
    const abortController = new AbortController();
    const task = createRunningSubagentTask({
      taskId,
      chatId,
      appId: 1,
      subagent: "worker",
      description: "Do something",
    });

    registerSubagentTask(task, abortController);

    expect(getSubagentTask(taskId)).toMatchObject({
      taskId,
      chatId,
      status: "running",
    });
    expect(listSubagentTasksForChat(chatId)).toEqual(
      expect.arrayContaining([expect.objectContaining({ taskId, chatId })]),
    );
  });

  it("updates terminal state and clears the abort controller", () => {
    const taskId = uniqueId("task");
    const chatId = Math.floor(Math.random() * 1_000_000);
    const abortController = new AbortController();
    registerSubagentTask(
      createRunningSubagentTask({
        taskId,
        chatId,
        appId: 1,
        subagent: "worker",
        description: "Do something",
      }),
      abortController,
    );

    const updated = updateSubagentTask(taskId, (current) => ({
      ...current,
      status: "completed",
      output: "done",
      updatedAt: Date.now(),
    }));

    expect(updated).toMatchObject({
      taskId,
      status: "completed",
      output: "done",
    });
    expect(killSubagentTask(taskId)).toBe(false);
  });

  it("aborts running tasks when killed", () => {
    const taskId = uniqueId("task");
    const chatId = Math.floor(Math.random() * 1_000_000);
    const abortController = new AbortController();
    registerSubagentTask(
      createRunningSubagentTask({
        taskId,
        chatId,
        appId: 1,
        subagent: "explore",
        description: "Inspect code",
      }),
      abortController,
    );

    expect(abortController.signal.aborted).toBe(false);
    expect(killSubagentTask(taskId)).toBe(true);
    expect(abortController.signal.aborted).toBe(true);
  });
});
