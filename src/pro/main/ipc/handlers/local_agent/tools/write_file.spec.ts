import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs/promises";
import { writeFileTool } from "./write_file";
import type { AgentContext } from "./types";

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    stat: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

vi.mock("electron-log", () => ({
  default: {
    scope: () => ({
      log: vi.fn(),
    }),
  },
}));

vi.mock("@/ipc/utils/path_utils", () => ({
  safeJoin: (base: string, filePath: string) => `${base}/${filePath}`,
}));

vi.mock("../../../../../../supabase_admin/supabase_utils", () => ({
  isServerFunction: vi.fn(() => false),
  isSharedServerModule: vi.fn(() => false),
}));

vi.mock(
  "../../../../../../supabase_admin/supabase_management_client",
  () => ({
    deploySupabaseFunction: vi.fn(),
  }),
);

describe("writeFileTool", () => {
  const createContext = (): AgentContext => ({
    event: {} as never,
    appId: 1,
    appPath: "/test/app",
    chatId: 1,
    supabaseProjectId: null,
    supabaseOrganizationSlug: null,
    messageId: 1,
    isSharedModulesChanged: false,
    todos: [],
    dyadRequestId: "req",
    fileEditTracker: {},
    readFileState: {},
    onXmlStream: vi.fn(),
    onXmlComplete: vi.fn(),
    requireConsent: vi.fn(),
    appendUserMessage: vi.fn(),
    onUpdateTodos: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows overwriting an existing file when the prior read state matches normalized content", async () => {
    const context = createContext();
    context.readFileState["src/hooks/useTetris.ts"] = {
      content: "line 1\nline 2\n",
      modifiedTimeMs: 100,
      lineEndings: "CRLF",
    };

    vi.mocked(fs.readFile).mockResolvedValue("line 1\r\nline 2\r\n");
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ mtimeMs: 100 } as Awaited<ReturnType<typeof fs.stat>>)
      .mockResolvedValueOnce({ mtimeMs: 101 } as Awaited<ReturnType<typeof fs.stat>>);

    await writeFileTool.execute(
      {
        path: "src/hooks/useTetris.ts",
        content: "line 1\nline 3\n",
      },
      context,
    );

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/test/app/src/hooks/useTetris.ts",
      "line 1\nline 3\n",
    );
    expect(context.readFileState["src/hooks/useTetris.ts"]).toEqual({
      content: "line 1\nline 3\n",
      modifiedTimeMs: 101,
    });
  });
});
