import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateDesignDraftTool } from "./update_design_draft";
import type { AgentContext } from "./types";

const { getDesignDraftForChatFileMock, updateDesignDraftFileMock } =
  vi.hoisted(() => ({
    getDesignDraftForChatFileMock: vi.fn(),
    updateDesignDraftFileMock: vi.fn(),
  }));

vi.mock("@/ipc/handlers/design_handlers", () => ({
  getDesignDraftForChatFile: getDesignDraftForChatFileMock,
  updateDesignDraftFile: updateDesignDraftFileMock,
}));

describe("updateDesignDraftTool", () => {
  let mockContext: AgentContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      event: {} as any,
      appId: 7,
      appPath: "D:/Project/dyad",
      chatId: 33,
      supabaseProjectId: null,
      supabaseOrganizationSlug: null,
      messageId: 8,
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

  it("throws when no existing draft is available", async () => {
    getDesignDraftForChatFileMock.mockResolvedValue(null);

    await expect(
      updateDesignDraftTool.execute(
        { title: "Revise hero" },
        mockContext,
      ),
    ).rejects.toThrow(
      "No design draft exists yet for this chat. Use create_design_draft first.",
    );
  });

  it("updates the current draft and emits XML metadata", async () => {
    getDesignDraftForChatFileMock.mockResolvedValue({
      id: "draft-2",
      title: "Current draft",
    });
    updateDesignDraftFileMock.mockResolvedValue({
      id: "draft-2",
      title: "Updated draft",
    });

    const result = await updateDesignDraftTool.execute(
      {
        title: "Updated draft",
        html: "<!DOCTYPE html><html><head></head><body>v2</body></html>",
      },
      mockContext,
    );

    expect(updateDesignDraftFileMock).toHaveBeenCalledWith({
      appId: 7,
      draftId: "draft-2",
      title: "Updated draft",
      brief: undefined,
      deviceMode: undefined,
      html: "<!DOCTYPE html><html><head></head><body>v2</body></html>",
    });
    expect(mockContext.onXmlComplete).toHaveBeenCalledWith(
      '<dyad-design-draft action="updated" draft-id="draft-2" title="Updated draft"></dyad-design-draft>',
    );
    expect(result).toBe('Updated design draft "Updated draft" (draft-2).');
  });
});
