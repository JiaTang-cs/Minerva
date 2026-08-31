import { beforeEach, describe, expect, it, vi } from "vitest";
import { exitDesignTool } from "./exit_design";
import type { AgentContext } from "./types";

const { safeSendMock, getDesignDraftForChatFileMock } = vi.hoisted(() => ({
  safeSendMock: vi.fn(),
  getDesignDraftForChatFileMock: vi.fn(),
}));

vi.mock("@/ipc/utils/safe_sender", () => ({
  safeSend: safeSendMock,
}));

vi.mock("@/ipc/handlers/design_handlers", () => ({
  getDesignDraftForChatFile: getDesignDraftForChatFileMock,
}));

describe("exitDesignTool", () => {
  let mockContext: AgentContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      event: { sender: {} } as any,
      appId: 5,
      appPath: "D:/Project/dyad",
      chatId: 22,
      supabaseProjectId: null,
      supabaseOrganizationSlug: null,
      messageId: 3,
      isSharedModulesChanged: false,
      todos: [],
      dyadRequestId: "request",
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

  it("requires explicit confirmation", async () => {
    await expect(
      exitDesignTool.execute({ confirmation: false }, mockContext),
    ).rejects.toThrow(
      "User must confirm the build handoff before exiting design mode",
    );
  });

  it("sends the design exit event when a draft exists", async () => {
    getDesignDraftForChatFileMock.mockResolvedValue({
      id: "draft-1",
      title: "Mobile task app",
    });

    const result = await exitDesignTool.execute(
      { confirmation: true },
      mockContext,
    );

    expect(getDesignDraftForChatFileMock).toHaveBeenCalledWith(5, 22);
    expect(safeSendMock).toHaveBeenCalledWith(
      mockContext.event.sender,
      "design:exit",
      {
        chatId: 22,
        draftId: "draft-1",
      },
    );
    expect(result).toContain("Switching to Agent mode");
  });
});
