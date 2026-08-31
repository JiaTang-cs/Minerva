import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcMainInvokeEvent } from "electron";
import { taskTool } from "./task";
import { updateSubagentTask } from "../subagents/task_state";

const resolveSubagentByNameMock = vi.fn();
const runSubagentStreamMock = vi.fn();

vi.mock("../subagents/registry", () => ({
  resolveSubagentByName: (...args: unknown[]) =>
    resolveSubagentByNameMock(...args),
}));

vi.mock("../subagents/runner", () => ({
  runSubagentStream: (...args: unknown[]) => runSubagentStreamMock(...args),
}));

function createContext() {
  const sent: Array<{ channel: string; payload: unknown }> = [];
  return {
    sent,
    ctx: {
      event: {
        sender: {
          isDestroyed: () => false,
          send: (channel: string, payload: unknown) => {
            sent.push({ channel, payload });
          },
        },
      } as unknown as IpcMainInvokeEvent,
      appId: 1,
      appPath: "d:/tmp/app",
      chatId: 10,
      readOnly: false,
      planModeOnly: false,
      designModeOnly: false,
      supabaseProjectId: null,
      supabaseOrganizationSlug: null,
      messageId: 99,
      isSharedModulesChanged: false,
      todos: [],
      dyadRequestId: "req-1",
      fileEditTracker: {},
      readFileState: {},
      onXmlStream: vi.fn(),
      onXmlComplete: vi.fn(),
      requireConsent: vi.fn(async () => true),
      appendUserMessage: vi.fn(),
      onUpdateTodos: vi.fn(),
      onWarningMessage: vi.fn(),
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("taskTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSubagentByNameMock.mockResolvedValue({
      subagent: {
        name: "worker",
        description: "Worker",
        source: "built-in",
        model: "inherit",
        getSystemPrompt: () => "worker prompt",
      },
      failedFiles: [],
    });
  });

  it("returns a completed foreground result and emits result XML", async () => {
    runSubagentStreamMock.mockResolvedValue({
      content: "Completed: done",
      toolUseCount: 2,
      durationMs: 1200,
    });
    const { ctx } = createContext();

    const result = await taskTool.execute(
      {
        subagent: "worker",
        description: "Implement feature",
        prompt: "Do the work",
      },
      ctx as any,
    );

    expect(JSON.parse(result)).toMatchObject({
      status: "completed",
      subagent: "worker",
      content: "Completed: done",
      toolUseCount: 2,
    });
    expect(ctx.onXmlComplete).toHaveBeenCalledWith(
      expect.stringContaining("dyad-subagent-result"),
    );
    expect(ctx.onXmlComplete).toHaveBeenCalledWith(
      expect.not.stringContaining("Completed: done"),
    );
  });

  it("returns async_launched for background tasks and emits task events", async () => {
    runSubagentStreamMock.mockResolvedValue({
      content: "Completed in background",
      toolUseCount: 1,
      durationMs: 500,
    });
    const { ctx, sent } = createContext();

    const result = await taskTool.execute(
      {
        subagent: "worker",
        description: "Background task",
        prompt: "Do the work later",
        runInBackground: true,
      },
      ctx as any,
    );

    const parsed = JSON.parse(result);
    expect(parsed.status).toBe("async_launched");
    expect(parsed.taskId).toBeTruthy();
    expect(
      sent.some(
        (entry) => entry.channel === "agent-tool:subagent-task-created",
      ),
    ).toBe(true);

    await Promise.resolve();
    await Promise.resolve();

    expect(
      sent.some(
        (entry) => entry.channel === "agent-tool:subagent-task-completed",
      ),
    ).toBe(true);
  });

  it("emits a failed event when a background task rejects", async () => {
    runSubagentStreamMock.mockRejectedValue(new Error("background exploded"));
    const { ctx, sent } = createContext();

    const result = await taskTool.execute(
      {
        subagent: "worker",
        description: "Background task",
        prompt: "Do the work later",
        runInBackground: true,
      },
      ctx as any,
    );

    const parsed = JSON.parse(result);
    expect(parsed.status).toBe("async_launched");

    await Promise.resolve();
    await Promise.resolve();

    const failedEvent = sent.find(
      (entry) => entry.channel === "agent-tool:subagent-task-failed",
    );
    expect(failedEvent).toBeTruthy();
    expect(failedEvent?.payload).toMatchObject({
      taskId: parsed.taskId,
      status: "failed",
      error: "background exploded",
    });
  });

  it("does not emit completion after the task is already terminal", async () => {
    const deferred = createDeferred<{
      content: string;
      toolUseCount: number;
      durationMs: number;
    }>();
    runSubagentStreamMock.mockReturnValue(deferred.promise);
    const { ctx, sent } = createContext();

    const result = await taskTool.execute(
      {
        subagent: "worker",
        description: "Background task",
        prompt: "Do the work later",
        runInBackground: true,
      },
      ctx as any,
    );

    const parsed = JSON.parse(result);
    updateSubagentTask(parsed.taskId, (current) => ({
      ...current,
      status: "killed",
      activeToolName: null,
      updatedAt: Date.now(),
    }));

    deferred.resolve({
      content: "late completion",
      toolUseCount: 3,
      durationMs: 900,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(
      sent.some(
        (entry) => entry.channel === "agent-tool:subagent-task-completed",
      ),
    ).toBe(false);
    expect(
      sent.some((entry) => entry.channel === "agent-tool:subagent-task-failed"),
    ).toBe(false);
  });
});
