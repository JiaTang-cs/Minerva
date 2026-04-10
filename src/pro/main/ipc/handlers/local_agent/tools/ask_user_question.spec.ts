import { describe, it, expect, vi, beforeEach } from "vitest";
import { askUserQuestionTool } from "./ask_user_question";
import type { AgentContext } from "./types";

const { safeSendMock, waitForAskUserQuestionResponseMock } = vi.hoisted(() => ({
  safeSendMock: vi.fn(),
  waitForAskUserQuestionResponseMock: vi.fn(),
}));

vi.mock("@/ipc/utils/safe_sender", () => ({
  safeSend: safeSendMock,
}));

vi.mock("../tool_definitions", () => ({
  waitForAskUserQuestionResponse: waitForAskUserQuestionResponseMock,
}));

vi.mock("electron-log", () => ({
  default: {
    scope: () => ({
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("askUserQuestionTool", () => {
  let mockContext: AgentContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      event: { sender: {} } as any,
      appId: 1,
      appPath: "D:/Project/dyad",
      chatId: 12,
      supabaseProjectId: null,
      supabaseOrganizationSlug: null,
      messageId: 99,
      isSharedModulesChanged: false,
      todos: [],
      dyadRequestId: "test-request",
      fileEditTracker: {},
      readFileState: {},
      onXmlStream: vi.fn(),
      onXmlComplete: vi.fn(),
      requireConsent: vi.fn().mockResolvedValue(true),
      appendUserMessage: vi.fn(),
      onUpdateTodos: vi.fn(),
      onWarningMessage: vi.fn(),
    };
  });

  it("requires 1-4 questions", () => {
    expect(() => askUserQuestionTool.inputSchema.parse({ questions: [] })).toThrow();

    expect(() =>
      askUserQuestionTool.inputSchema.parse({
        questions: Array.from({ length: 5 }, (_, index) => ({
          header: `Q${index}`,
          question: `Question ${index}?`,
          options: [
            { label: "A", description: "Option A" },
            { label: "B", description: "Option B" },
          ],
        })),
      }),
    ).toThrow();
  });

  it("requires a header for each question", () => {
    expect(() =>
      askUserQuestionTool.inputSchema.parse({
        questions: [
          {
            question: "Which platform?",
            options: [
              { label: "Web", description: "Desktop browser" },
              { label: "Mobile", description: "Phone-first" },
            ],
          },
        ],
      }),
    ).toThrow();
  });

  it("sends the ask-user-question event and returns formatted answers", async () => {
    waitForAskUserQuestionResponseMock.mockImplementation(
      async (requestId: string) => {
        const payload = safeSendMock.mock.calls.find(
          ([, channel, body]) =>
            channel === "design:ask-user-question" &&
            body.requestId === requestId,
        )?.[2] as
          | {
              questions: Array<{ id: string }>;
            }
          | undefined;

        if (!payload) {
          return null;
        }

        return {
          [payload.questions[0].id]: "Mobile",
        };
      },
    );

    const result = await askUserQuestionTool.execute(
      {
        questions: [
          {
            header: "Platform",
            question: "Which platform should this target?",
            multiSelect: false,
            options: [
              { label: "Mobile", description: "Phone-first experience" },
              { label: "Desktop", description: "Larger screens first" },
            ],
          },
        ],
      },
      mockContext,
    );

    expect(safeSendMock).toHaveBeenCalledTimes(1);
    expect(safeSendMock).toHaveBeenCalledWith(
      mockContext.event.sender,
      "design:ask-user-question",
      expect.objectContaining({
        chatId: 12,
        requestId: expect.stringContaining("design-ask-user-question:"),
        questions: [
          expect.objectContaining({
            header: "Platform",
            question: "Which platform should this target?",
            id: expect.stringContaining("design_question_"),
          }),
        ],
      }),
    );

    expect(mockContext.onXmlComplete).toHaveBeenCalledWith(
      expect.stringContaining("<dyad-ask-user-question count=\"1\">"),
    );
    expect(mockContext.onXmlComplete).toHaveBeenCalledWith(
      expect.stringContaining('header="Platform"'),
    );
    expect(result).toContain("Which platform should this target?");
    expect(result).toContain("Mobile");
  });

  it("returns a dismiss message when the user closes the UI", async () => {
    waitForAskUserQuestionResponseMock.mockResolvedValue(null);

    const result = await askUserQuestionTool.execute(
      {
        questions: [
          {
            header: "Style",
            question: "What style should it use?",
            multiSelect: false,
            options: [
              { label: "Clean", description: "Minimal and structured" },
              { label: "Expressive", description: "Bold and branded" },
            ],
          },
        ],
      },
      mockContext,
    );

    expect(result).toBe(
      "The user dismissed ask user question without answering.",
    );
    expect(mockContext.onXmlComplete).not.toHaveBeenCalled();
  });
});
