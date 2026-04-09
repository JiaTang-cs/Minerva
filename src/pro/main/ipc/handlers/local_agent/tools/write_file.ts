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

const logger = log.scope("write_file");

const writeFileSchema = z.object({
  path: z.string().describe("The file path relative to the app root"),
  content: z.string().describe("The full content to write to the file"),
  description: z
    .string()
    .optional()
    .describe("Brief description of what is being written."),
});

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
    return `File written, but failed to deploy Supabase function: ${error}`;
  }
}

export const writeFileTool: ToolDefinition<z.infer<typeof writeFileSchema>> = {
  name: "write_file",
  description:
    "Create a new file or completely overwrite an existing file in the codebase. Read existing files before overwriting them.",
  inputSchema: writeFileSchema,
  defaultConsent: "always",
  modifiesState: true,

  getConsentPreview: (args) => `Write to ${args.path}`,

  buildXml: (args, isComplete) => {
    if (!args.path) return undefined;

    let xml = `<dyad-write path="${escapeXmlAttr(args.path)}" description="${escapeXmlAttr(args.description ?? "")}">`;
    if (args.content !== undefined) {
      xml += `\n${escapeXmlContent(args.content)}`;
    }
    if (isComplete) {
      xml += "\n</dyad-write>";
    }
    return xml;
  },

  execute: async (args, ctx: AgentContext) => {
    const fullFilePath = safeJoin(ctx.appPath, args.path);

    if (isSharedServerModule(args.path)) {
      ctx.isSharedModulesChanged = true;
    }

    let existingContent: string | null = null;
    let existingStat: Awaited<ReturnType<typeof fs.stat>> | null = null;

    try {
      [existingContent, existingStat] = await Promise.all([
        fs.readFile(fullFilePath, "utf8"),
        fs.stat(fullFilePath),
      ]);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    if (existingContent !== null) {
      const priorRead = ctx.readFileState[args.path];
      if (!priorRead) {
        throw new DyadError(
          `You must read ${args.path} before overwriting it`,
          DyadErrorKind.Precondition,
        );
      }

      if (
        existingStat &&
        existingStat.mtimeMs > priorRead.modifiedTimeMs &&
        existingContent !== priorRead.content
      ) {
        throw new DyadError(
          `File changed since it was read: ${args.path}`,
          DyadErrorKind.Conflict,
        );
      }
    }

    await fs.mkdir(path.dirname(fullFilePath), { recursive: true });
    await fs.writeFile(fullFilePath, args.content);

    const nextStat = await fs.stat(fullFilePath);
    ctx.readFileState[args.path] = {
      content: args.content,
      modifiedTimeMs: nextStat.mtimeMs,
    };

    logger.log(`Successfully wrote file: ${fullFilePath}`);

    const deployMessage = await maybeDeployServerFunction(ctx, args.path);
    return deployMessage ?? `Successfully wrote ${args.path}`;
  },
};
