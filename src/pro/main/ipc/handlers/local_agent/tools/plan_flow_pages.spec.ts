import { beforeEach, describe, expect, it, vi } from "vitest";
import { planFlowPagesTool } from "./plan_flow_pages";
import type { AgentContext } from "./types";

const {
  safeSendMock,
  waitForAskUserQuestionResponseMock,
  getDesignDraftForChatFileMock,
  updateDesignFlowStatusFileMock,
} = vi.hoisted(() => ({
  safeSendMock: vi.fn(),
  waitForAskUserQuestionResponseMock: vi.fn(),
  getDesignDraftForChatFileMock: vi.fn(),
  updateDesignFlowStatusFileMock: vi.fn(),
}));

vi.mock("@/ipc/utils/safe_sender", () => ({
  safeSend: safeSendMock,
}));

vi.mock("../tool_definitions", () => ({
  waitForAskUserQuestionResponse: waitForAskUserQuestionResponseMock,
}));

vi.mock("@/ipc/handlers/design_handlers", () => ({
  getDesignDraftForChatFile: getDesignDraftForChatFileMock,
  getDesignDraftFile: vi.fn(),
  updateDesignFlowStatusFile: updateDesignFlowStatusFileMock,
}));

describe("planFlowPagesTool", () => {
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

  it("plans approved pages and emits a flow pages card", async () => {
    getDesignDraftForChatFileMock.mockResolvedValue({
      id: "draft-1",
      title: "Root Page",
      flowId: "flow-1",
    });
    waitForAskUserQuestionResponseMock.mockImplementation(
      async (requestId: string) => {
        const payload = safeSendMock.mock.calls.find(
          ([, channel, body]) =>
            channel === "design:ask-user-question" &&
            body.requestId === requestId,
        )?.[2];
        return {
          [payload.questions[0].id]: "Pricing, FAQ",
        };
      },
    );

    const result = await planFlowPagesTool.execute(
      {
        suggestedPages: [
          { title: "Pricing", prompt: "Design the pricing page" },
          { title: "About", prompt: "Design the about page" },
        ],
      },
      mockContext,
    );

    expect(updateDesignFlowStatusFileMock).toHaveBeenCalledWith({
      appId: 1,
      flowId: "flow-1",
      status: "planning",
      title: undefined,
    });
    expect(safeSendMock).toHaveBeenCalledWith(
      mockContext.event.sender,
      "design:ask-user-question",
      expect.objectContaining({
        chatId: 12,
      }),
    );
    expect(mockContext.onXmlComplete).toHaveBeenCalledWith(
      expect.stringContaining('<dyad-design-flow-pages action="planned"'),
    );
    expect(result).toContain('"title": "Pricing"');
    expect(result).toContain('"title": "FAQ"');
  });
});
