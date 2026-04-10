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
import {
  applyLineEndings,
  detectLineEndings,
  normalizeLineEndings,
} from "./file_content_utils";
import { safeJoin } from "@/ipc/utils/path_utils";
import { deploySupabaseFunction } from "../../../../../../supabase_admin/supabase_management_client";
import {
  isServerFunction,
  isSharedServerModule,
} from "../../../../../../supabase_admin/supabase_utils";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

const logger = log.scope("edit_file");

const LEFT_SINGLE_CURLY_QUOTE = "\u2018";
const RIGHT_SINGLE_CURLY_QUOTE = "\u2019";
const LEFT_DOUBLE_CURLY_QUOTE = "\u201C";
const RIGHT_DOUBLE_CURLY_QUOTE = "\u201D";

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
- Preserve the exact indentation and line breaks from the file when building \`old_string\`.
- Set \`replace_all\` only when every occurrence should change.
- For creating new files or rewriting nearly the whole file, use \`write_file\` instead.`;

function normalizeQuotes(str: string): string {
  return str
    .split(LEFT_SINGLE_CURLY_QUOTE)
    .join("'")
    .split(RIGHT_SINGLE_CURLY_QUOTE)
    .join("'")
    .split(LEFT_DOUBLE_CURLY_QUOTE)
    .join('"')
    .split(RIGHT_DOUBLE_CURLY_QUOTE)
    .join('"');
}

function findActualString(
  fileContent: string,
  searchString: string,
): string | null {
  const candidateStrings = Array.from(
    new Set([
      searchString,
      searchString.split("\r\n").join("\n"),
      searchString.split("\n").join("\r\n"),
    ]),
  );

  for (const candidate of candidateStrings) {
    if (fileContent.includes(candidate)) {
      return candidate;
    }
  }

  const normalizedFile = normalizeQuotes(fileContent);
  for (const candidate of candidateStrings) {
    const normalizedCandidate = normalizeQuotes(candidate);
    const searchIndex = normalizedFile.indexOf(normalizedCandidate);
    if (searchIndex !== -1) {
      return fileContent.substring(
        searchIndex,
        searchIndex + normalizedCandidate.length,
      );
    }
  }

  return null;
}

function isOpeningContext(chars: string[], index: number): boolean {
  if (index === 0) {
    return true;
  }

  const prev = chars[index - 1];
  return (
    prev === " " ||
    prev === "\t" ||
    prev === "\n" ||
    prev === "\r" ||
    prev === "(" ||
    prev === "[" ||
    prev === "{" ||
    prev === "\u2014" ||
    prev === "\u2013"
  );
}

function applyCurlyDoubleQuotes(str: string): string {
  const chars = [...str];
  const result: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    result.push(
      chars[i] === '"'
        ? isOpeningContext(chars, i)
          ? LEFT_DOUBLE_CURLY_QUOTE
          : RIGHT_DOUBLE_CURLY_QUOTE
        : chars[i]!,
    );
  }

  return result.join("");
}

function applyCurlySingleQuotes(str: string): string {
  const chars = [...str];
  const result: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== "'") {
      result.push(chars[i]!);
      continue;
    }

    const prev = i > 0 ? chars[i - 1] : undefined;
    const next = i < chars.length - 1 ? chars[i + 1] : undefined;
    const prevIsLetter = prev !== undefined && /\p{L}/u.test(prev);
    const nextIsLetter = next !== undefined && /\p{L}/u.test(next);

    if (prevIsLetter && nextIsLetter) {
      result.push(RIGHT_SINGLE_CURLY_QUOTE);
      continue;
    }

    result.push(
      isOpeningContext(chars, i)
        ? LEFT_SINGLE_CURLY_QUOTE
        : RIGHT_SINGLE_CURLY_QUOTE,
    );
  }

  return result.join("");
}

function preserveQuoteStyle(
  oldString: string,
  actualOldString: string,
  newString: string,
): string {
  if (oldString === actualOldString) {
    return newString;
  }

  const hasDoubleQuotes =
    actualOldString.includes(LEFT_DOUBLE_CURLY_QUOTE) ||
    actualOldString.includes(RIGHT_DOUBLE_CURLY_QUOTE);
  const hasSingleQuotes =
    actualOldString.includes(LEFT_SINGLE_CURLY_QUOTE) ||
    actualOldString.includes(RIGHT_SINGLE_CURLY_QUOTE);

  let result = newString;
  if (hasDoubleQuotes) {
    result = applyCurlyDoubleQuotes(result);
  }
  if (hasSingleQuotes) {
    result = applyCurlySingleQuotes(result);
  }

  return result;
}

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

    let currentContentRaw: string;
    let currentStat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      [currentContentRaw, currentStat] = await Promise.all([
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
      normalizeLineEndings(currentContentRaw) !== priorRead.content
    ) {
      throw new DyadError(
        `File changed since it was read: ${args.path}`,
        DyadErrorKind.Conflict,
      );
    }

    const currentContent = normalizeLineEndings(currentContentRaw);
    const actualOldString = findActualString(currentContent, args.old_string);
    if (!actualOldString) {
      throw new DyadError(
        `old_string was not found in ${args.path}`,
        DyadErrorKind.Validation,
      );
    }

    const actualNewString = normalizeLineEndings(
      preserveQuoteStyle(args.old_string, actualOldString, args.new_string),
    );

    const matches = currentContent.split(actualOldString).length - 1;
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
      ? currentContent.split(actualOldString).join(actualNewString)
      : currentContent.replace(actualOldString, actualNewString);

    await fs.writeFile(
      fullFilePath,
      applyLineEndings(nextContent, detectLineEndings(currentContentRaw)),
    );
    const nextStat = await fs.stat(fullFilePath);
    ctx.readFileState[args.path] = {
      content: nextContent,
      modifiedTimeMs: nextStat.mtimeMs,
      lineEndings: detectLineEndings(currentContentRaw),
    };

    logger.log(`Successfully edited file: ${fullFilePath}`);

    const deployMessage = await maybeDeployServerFunction(ctx, args.path);
    return deployMessage ?? `Successfully edited ${args.path}`;
  },
};
