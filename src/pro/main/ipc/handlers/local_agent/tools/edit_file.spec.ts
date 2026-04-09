import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs/promises";
import { editFileTool } from "./edit_file";
import type { AgentContext } from "./types";

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    stat: vi.fn(),
    writeFile: vi.fn(),
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

describe("editFileTool", () => {
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
    readFileState: {
      "src/hooks/useTetris.ts": {
        content: "",
        modifiedTimeMs: 100,
      },
    },
    onXmlStream: vi.fn(),
    onXmlComplete: vi.fn(),
    requireConsent: vi.fn(),
    appendUserMessage: vi.fn(),
    onUpdateTodos: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matches LF old_string against CRLF file content and preserves CRLF on write", async () => {
    const context = createContext();
    const originalContent =
      "export function useTetris() {\r\n  return true;\r\n}\r\n";
    context.readFileState["src/hooks/useTetris.ts"] = {
      content: originalContent,
      modifiedTimeMs: 100,
    };

    vi.mocked(fs.readFile).mockResolvedValue(originalContent);
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ mtimeMs: 100 } as Awaited<ReturnType<typeof fs.stat>>)
      .mockResolvedValueOnce({ mtimeMs: 101 } as Awaited<ReturnType<typeof fs.stat>>);

    await editFileTool.execute(
      {
        path: "src/hooks/useTetris.ts",
        old_string: "export function useTetris() {\n  return true;\n}\n",
        new_string: "export function useTetris() {\n  return false;\n}\n",
      },
      context,
    );

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/test/app/src/hooks/useTetris.ts",
      "export function useTetris() {\r\n  return false;\r\n}\r\n",
    );
  });

  it("matches straight quotes against curly quotes and preserves quote style", async () => {
    const context = createContext();
    const originalContent = 'const label = “Play”;';
    context.readFileState["src/hooks/useTetris.ts"] = {
      content: originalContent,
      modifiedTimeMs: 100,
    };

    vi.mocked(fs.readFile).mockResolvedValue(originalContent);
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ mtimeMs: 100 } as Awaited<ReturnType<typeof fs.stat>>)
      .mockResolvedValueOnce({ mtimeMs: 101 } as Awaited<ReturnType<typeof fs.stat>>);

    await editFileTool.execute(
      {
        path: "src/hooks/useTetris.ts",
        old_string: 'const label = "Play";',
        new_string: 'const label = "Pause";',
      },
      context,
    );

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/test/app/src/hooks/useTetris.ts",
      "const label = “Pause”;",
    );
  });
});
