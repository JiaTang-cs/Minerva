import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDesignDraftTool } from "./create_design_draft";
import type { AgentContext } from "./types";

const { createDesignDraftFileMock } = vi.hoisted(() => ({
  createDesignDraftFileMock: vi.fn(),
}));

vi.mock("@/ipc/handlers/design_handlers", () => ({
  createDesignDraftFile: createDesignDraftFileMock,
}));

describe("createDesignDraftTool", () => {
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

  it("creates a draft and emits XML metadata", async () => {
    createDesignDraftFileMock.mockResolvedValue({
      id: "draft-1",
      title: "Marketing Landing Page",
    });

    const html = "<!DOCTYPE html><html><head></head><body></body></html>";
    const result = await createDesignDraftTool.execute(
      {
        title: "Marketing Landing Page",
        brief: "Hero-first landing page",
        deviceMode: "desktop",
        html,
      },
      mockContext,
    );

    expect(createDesignDraftFileMock).toHaveBeenCalledWith({
      appId: 5,
      chatId: 22,
      title: "Marketing Landing Page",
      brief: "Hero-first landing page",
      deviceMode: "desktop",
      html,
    });
    expect(mockContext.onXmlComplete).toHaveBeenCalledWith(
      '<dyad-design-draft action="created" draft-id="draft-1" title="Marketing Landing Page"></dyad-design-draft>',
    );
    expect(result).toBe(
      'Created design draft "Marketing Landing Page" with id draft-1.',
    );
  });
});
