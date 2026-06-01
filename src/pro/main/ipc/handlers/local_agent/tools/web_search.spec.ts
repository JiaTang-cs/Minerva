import { beforeEach, describe, expect, it, vi } from "vitest";
import { webSearchTool } from "./web_search";
import type { AgentContext } from "./types";

vi.mock("@/ipc/utils/read_env", () => ({
  getEnvVar: vi.fn((key: string) => {
    if (key === "SERPER_API_KEY") return "test-serper-api-key";
    return undefined;
  }),
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

describe("webSearchTool", () => {
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

  it("returns formatted search results and emits XML", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          organic: [
            {
              title: "Dyad Docs",
              link: "https://docs.dyad.sh",
              snippet: "Official documentation",
            },
            {
              title: "Dyad GitHub",
              link: "https://github.com/SeassTar-xx/minerva",
              snippet: "Open source repository",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await webSearchTool.execute(
      { query: "dyad documentation" },
      mockContext,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://google.serper.dev/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-API-KEY": "test-serper-api-key",
        }),
      }),
    );
    expect(result).toContain('Web search results for "dyad documentation":');
    expect(result).toContain("Dyad Docs");
    expect(result).toContain("https://docs.dyad.sh");
    expect(mockContext.onXmlStream).toHaveBeenCalledWith(
      '<dyad-web-search query="dyad documentation">',
    );
    expect(mockContext.onXmlComplete).toHaveBeenCalledWith(
      expect.stringContaining("</dyad-web-search>"),
    );
  });

  it("includes answer box results before organic results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          answerBox: {
            title: "Vite",
            answer: "A frontend build tool",
            link: "https://vite.dev",
          },
          organic: [
            {
              title: "Vite Guide",
              link: "https://vite.dev/guide/",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await webSearchTool.execute({ query: "vite" }, mockContext);

    expect(result.indexOf("1. Vite")).toBeLessThan(
      result.indexOf("2. Vite Guide"),
    );
  });

  it("throws when the search API returns no results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ organic: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await webSearchTool.execute(
      { query: "no matches expected" },
      mockContext,
    );

    expect(result).toBe('No web search results found for "no matches expected".');
  });
});
