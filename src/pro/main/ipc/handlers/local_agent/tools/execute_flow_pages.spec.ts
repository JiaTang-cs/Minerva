import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeFlowPagesTool } from "./execute_flow_pages";
import type { AgentContext } from "./types";

const {
  getDesignDraftForChatFileMock,
  updateDesignFlowStatusFileMock,
  createGeneratedFlowPageFileMock,
} = vi.hoisted(() => ({
  getDesignDraftForChatFileMock: vi.fn(),
  updateDesignFlowStatusFileMock: vi.fn(),
  createGeneratedFlowPageFileMock: vi.fn(),
}));

vi.mock("@/ipc/handlers/design_handlers", () => ({
  getDesignDraftForChatFile: getDesignDraftForChatFileMock,
  getDesignDraftFile: vi.fn(),
  updateDesignFlowStatusFile: updateDesignFlowStatusFileMock,
  createGeneratedFlowPageFile: createGeneratedFlowPageFileMock,
}));

describe("executeFlowPagesTool", () => {
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

  it("creates generated pages and emits XML metadata", async () => {
    getDesignDraftForChatFileMock.mockResolvedValue({
      id: "draft-1",
      flowId: "flow-1",
      deviceMode: "desktop",
    });
    createGeneratedFlowPageFileMock.mockResolvedValue({
      draft: { id: "draft-2" },
      page: { id: "page-2", title: "Pricing" },
    });

    const result = await executeFlowPagesTool.execute(
      {
        pages: [
          {
            title: "Pricing",
            html: "<!DOCTYPE html><html><head></head><body>Pricing</body></html>",
          },
        ],
      },
      mockContext,
    );

    expect(updateDesignFlowStatusFileMock).toHaveBeenNthCalledWith(1, {
      appId: 5,
      flowId: "flow-1",
      status: "generating",
    });
    expect(createGeneratedFlowPageFileMock).toHaveBeenCalledWith({
      appId: 5,
      sourceDraftId: "draft-1",
      title: "Pricing",
      prompt: undefined,
      deviceMode: "desktop",
      html: "<!DOCTYPE html><html><head></head><body>Pricing</body></html>",
    });
    expect(mockContext.onXmlComplete).toHaveBeenCalledWith(
      expect.stringContaining('<dyad-design-flow-pages action="generated"'),
    );
    expect(result).toContain('"title": "Pricing"');
  });
});
