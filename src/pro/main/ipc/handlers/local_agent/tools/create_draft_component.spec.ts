import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDraftComponentTool } from "./create_draft_component";
import type { AgentContext } from "./types";

const { createDraftComponentFileMock, getDesignDraftForChatFileMock } =
  vi.hoisted(() => ({
    createDraftComponentFileMock: vi.fn(),
    getDesignDraftForChatFileMock: vi.fn(),
  }));

vi.mock("@/ipc/handlers/design_handlers", () => ({
  createDraftComponentFile: createDraftComponentFileMock,
  getDesignDraftForChatFile: getDesignDraftForChatFileMock,
}));

describe("createDraftComponentTool", () => {
  let mockContext: AgentContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      event: {} as any,
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

  it("creates a component and emits XML metadata", async () => {
    getDesignDraftForChatFileMock.mockResolvedValue({ id: "draft-1" });
    createDraftComponentFileMock.mockResolvedValue({
      id: "component-1",
      draftId: "draft-1",
      name: "NavBar",
    });

    const result = await createDraftComponentTool.execute(
      {
        name: "NavBar",
        htmlTemplate: "<nav></nav>",
        props: [],
      },
      mockContext,
    );

    expect(createDraftComponentFileMock).toHaveBeenCalledWith({
      appId: 5,
      draftId: "draft-1",
      name: "NavBar",
      description: undefined,
      htmlTemplate: "<nav></nav>",
      previewHtml: undefined,
      props: [],
    });
    expect(mockContext.onXmlComplete).toHaveBeenCalledWith(
      expect.stringContaining('<dyad-design-component action="created"'),
    );
    expect(result).toContain('"id": "component-1"');
  });
});
