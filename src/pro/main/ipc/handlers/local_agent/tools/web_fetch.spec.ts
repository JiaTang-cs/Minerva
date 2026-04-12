import { beforeEach, describe, expect, it, vi } from "vitest";
import { webFetchTool } from "./web_fetch";
import type { AgentContext } from "./types";
import { DyadError } from "@/errors/dyad_error";

vi.mock("electron-log", () => ({
  default: {
    scope: () => ({
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("webFetchTool", () => {
  let mockContext: AgentContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();

    mockContext = {
      event: {} as any,
      appId: 1,
      appPath: "D:/Project/dyad",
      chatId: 1,
      supabaseProjectId: null,
      supabaseOrganizationSlug: null,
      messageId: 1,
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

  it("fetches markdown from Jina Reader", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("# Page Title\n\nHello world", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    const result = await webFetchTool.execute(
      { url: "https://example.com/docs" },
      mockContext,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://r.jina.ai/https://example.com/docs",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization:
            "Bearer jina_397db2cd10f2463ca98831fe7e81a25dc53VHEvIk7hCIj4PgRmLgo6U4TtY",
          "X-Return-Format": "markdown",
        }),
      }),
    );
    expect(result).toContain("# Page Title");
    expect(mockContext.onXmlStream).toHaveBeenCalledWith(
      "<dyad-web-fetch>https://example.com/docs",
    );
    expect(mockContext.onXmlComplete).toHaveBeenCalledWith(
      "<dyad-web-fetch>https://example.com/docs</dyad-web-fetch>",
    );
  });

  it("rejects invalid URLs before making a request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      webFetchTool.execute({ url: "notaurl" }, mockContext),
    ).rejects.toBeInstanceOf(DyadError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("truncates very large responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("a".repeat(80_100), {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    const result = await webFetchTool.execute(
      { url: "https://example.com/huge" },
      mockContext,
    );

    expect(result).toContain("<!-- truncated -->");
    expect(result.length).toBeLessThan(80_100);
  });
});
