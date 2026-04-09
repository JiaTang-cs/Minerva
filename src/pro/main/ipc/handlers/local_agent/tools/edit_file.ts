import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import log from "electron-log";
import {
  ToolDefinition,
  AgentContext,
  escapeXmlAttr,
  escapeXmlContent,
} from "./types";
import { safeJoin } from "@/ipc/utils/path_utils";
import { deploySupabaseFunction } from "../../../../../../supabase_admin/supabase_management_client";
import {
  isServerFunction,
  isSharedServerModule,
} from "../../../../../../supabase_admin/supabase_utils";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

const logger = log.scope("edit_file");

const editFileSchema = z.object({
  path: z.string().describe("The file path relative to the app root"),
  old_string: z
    .string()
    .describe("The exact text to replace. It must match the file contents."),
  new_string: z
    .string()
    .describe("The replacement text. It must be different from old_string."),
  replace_all: z
    .boolean()
    .optional()
    .describe("Replace all occurrences instead of exactly one."),
});

const DESCRIPTION = `Perform an exact local text replacement inside an existing file.

- You must read the file first with \`read_file\` before calling this tool.
- Use the smallest exact match that is still unique.
- Set \`replace_all\` only when every occurrence should change.
- For creating new files or rewriting nearly the whole file, use \`write_file\` instead.`;

async function maybeDeployServerFunction(
  ctx: AgentContext,
  relativePath: string,
): Promise<string | null> {
  if (
    !ctx.supabaseProjectId ||
    !isServerFunction(relativePath) ||
    ctx.isSharedModulesChanged
  ) {
    return null;
  }

  try {
    await deploySupabaseFunction({
      supabaseProjectId: ctx.supabaseProjectId,
      functionName: path.basename(path.dirname(relativePath)),
      appPath: ctx.appPath,
      organizationSlug: ctx.supabaseOrganizationSlug ?? null,
    });
    return null;
  } catch (error) {
    return `Edit applied, but failed to deploy Supabase function: ${error}`;
  }
}

export const editFileTool: ToolDefinition<z.infer<typeof editFileSchema>> = {
  name: "edit_file",
  description: DESCRIPTION,
  inputSchema: editFileSchema,
  defaultConsent: "always",
  modifiesState: true,

  getConsentPreview: (args) => `Edit ${args.path}`,

  buildXml: (args, isComplete) => {
    if (!args.path) return undefined;

    let xml = `<dyad-edit path="${escapeXmlAttr(args.path)}">`;
    if (args.old_string !== undefined) {
      xml += `\n<old_string>${escapeXmlContent(args.old_string)}</old_string>`;
    }
    if (args.new_string !== undefined) {
      xml += `\n<new_string>${escapeXmlContent(args.new_string)}</new_string>`;
    }
    if (isComplete) {
      xml += "\n</dyad-edit>";
    }
    return xml;
  },

  execute: async (args, ctx: AgentContext) => {
    if (args.old_string === args.new_string) {
      throw new DyadError(
        "old_string and new_string must be different",
        DyadErrorKind.Validation,
      );
    }

    const fullFilePath = safeJoin(ctx.appPath, args.path);

    if (isSharedServerModule(args.path)) {
      ctx.isSharedModulesChanged = true;
    }

    const priorRead = ctx.readFileState[args.path];
    if (!priorRead) {
      throw new DyadError(
        `You must read ${args.path} before editing it`,
        DyadErrorKind.Precondition,
      );
    }

    let currentContent: string;
    let currentStat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      [currentContent, currentStat] = await Promise.all([
        fs.readFile(fullFilePath, "utf8"),
        fs.stat(fullFilePath),
      ]);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new DyadError(
          `File does not exist: ${args.path}`,
          DyadErrorKind.NotFound,
        );
      }
      throw error;
    }

    if (
      currentStat.mtimeMs > priorRead.modifiedTimeMs &&
      currentContent !== priorRead.content
    ) {
      throw new DyadError(
        `File changed since it was read: ${args.path}`,
        DyadErrorKind.Conflict,
      );
    }

    const matches = currentContent.split(args.old_string).length - 1;
    if (matches === 0) {
      throw new DyadError(
        `old_string was not found in ${args.path}`,
        DyadErrorKind.Validation,
      );
    }

    if (matches > 1 && !args.replace_all) {
      throw new DyadError(
        `old_string appears ${matches} times in ${args.path}; provide a more specific match or set replace_all`,
        DyadErrorKind.Validation,
      );
    }

    const nextContent = args.replace_all
      ? currentContent.split(args.old_string).join(args.new_string)
      : currentContent.replace(args.old_string, args.new_string);

    await fs.writeFile(fullFilePath, nextContent);
    const nextStat = await fs.stat(fullFilePath);
    ctx.readFileState[args.path] = {
      content: nextContent,
      modifiedTimeMs: nextStat.mtimeMs,
    };

    logger.log(`Successfully edited file: ${fullFilePath}`);

    const deployMessage = await maybeDeployServerFunction(ctx, args.path);
    return deployMessage ?? `Successfully edited ${args.path}`;
  },
};
