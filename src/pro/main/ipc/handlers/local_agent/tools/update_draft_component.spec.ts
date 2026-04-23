import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateDraftComponentTool } from "./update_draft_component";
import type { AgentContext } from "./types";

const { updateDraftComponentFileMock } = vi.hoisted(() => ({
  updateDraftComponentFileMock: vi.fn(),
}));

vi.mock("@/ipc/handlers/design_handlers", () => ({
  updateDraftComponentFile: updateDraftComponentFileMock,
}));

describe("updateDraftComponentTool", () => {
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

  it("updates a component and emits XML metadata", async () => {
    updateDraftComponentFileMock.mockResolvedValue({
      id: "component-1",
      draftId: "draft-1",
      name: "NavBar",
    });

    const result = await updateDraftComponentTool.execute(
      {
        componentId: "component-1",
        htmlTemplate: "<nav :href=\"homeHref\"></nav>",
      },
      mockContext,
    );

    expect(updateDraftComponentFileMock).toHaveBeenCalledWith({
      appId: 5,
      componentId: "component-1",
      name: undefined,
      description: undefined,
      htmlTemplate: "<nav :href=\"homeHref\"></nav>",
      previewHtml: undefined,
      props: undefined,
    });
    expect(mockContext.onXmlComplete).toHaveBeenCalledWith(
      expect.stringContaining('<dyad-design-component action="updated"'),
    );
    expect(result).toContain('"id": "component-1"');
  });
});
