import { beforeEach, describe, expect, it, vi } from "vitest";
import { readDesignDraftTool } from "./read_design_draft";
import type { AgentContext } from "./types";

const { getDesignDraftForChatFileMock } = vi.hoisted(() => ({
  getDesignDraftForChatFileMock: vi.fn(),
}));

vi.mock("@/ipc/handlers/design_handlers", () => ({
  getDesignDraftForChatFile: getDesignDraftForChatFileMock,
  getDesignDraftFile: vi.fn(),
}));

describe("readDesignDraftTool", () => {
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

  it("returns draft metadata and html", async () => {
    getDesignDraftForChatFileMock.mockResolvedValue({
      id: "draft-1",
      title: "Landing",
      brief: "hero page",
      deviceMode: "desktop",
      flowId: "flow-1",
      createdAt: "2026-04-23T00:00:00.000Z",
      updatedAt: "2026-04-23T00:00:00.000Z",
      html: "<!DOCTYPE html><html><head></head><body>Hello</body></html>",
    });

    const result = await readDesignDraftTool.execute({}, mockContext);
    expect(result).toContain('"title": "Landing"');
    expect(result).toContain("<body>Hello</body>");
  });
});
