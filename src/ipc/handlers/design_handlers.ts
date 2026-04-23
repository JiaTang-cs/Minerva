import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { apps } from "../../db/schema";
import { getDyadAppPath } from "../../paths/paths";
import { createTypedHandler } from "./base";
import {
  designContracts,
  type DesignDraft,
  type CreateDesignDraftParams,
  type UpdateDesignDraftParams,
} from "../types/design";
import { ensureInternalAppDirGitignored } from "./gitignoreUtils";
import { resolveAskUserQuestionResponse } from "../../pro/main/ipc/handlers/local_agent/tool_definitions";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { getInternalAppSubdirPath } from "../utils/internal_app_dir";

const DESIGN_DIR_NAME = "designs";

type StoredDesignDraft = DesignDraft;

function validateHtmlDocument(html: string) {
  const lower = html.toLowerCase();

  if (!lower.includes("<!doctype html")) {
    throw new DyadError(
      "Design draft HTML must include <!DOCTYPE html>",
      DyadErrorKind.Validation,
    );
  }

  if (!lower.includes("<html") || !lower.includes("</html>")) {
    throw new DyadError(
      "Design draft HTML must include a complete <html> document",
      DyadErrorKind.Validation,
    );
  }

  if (!lower.includes("<head") || !lower.includes("</head>")) {
    throw new DyadError(
      "Design draft HTML must include a <head> section",
      DyadErrorKind.Validation,
    );
  }

  if (!lower.includes("<body") || !lower.includes("</body>")) {
    throw new DyadError(
      "Design draft HTML must include a <body> section",
      DyadErrorKind.Validation,
    );
  }

  if (/<script[\s>]/i.test(html)) {
    throw new DyadError(
      "Design draft HTML must not include <script> tags",
      DyadErrorKind.Validation,
    );
  }
}

async function getDesignDir(appId: number): Promise<string> {
  const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
  if (!app) {
    throw new DyadError(`App not found: ${appId}`, DyadErrorKind.NotFound);
  }

  const appPath = getDyadAppPath(app.path);
  const designDir = getInternalAppSubdirPath(appPath, DESIGN_DIR_NAME);
  await fs.promises.mkdir(designDir, { recursive: true });
  await ensureInternalAppDirGitignored(appPath);
  return designDir;
}

function getDraftFilePath(designDir: string, draftId: string) {
  return path.join(designDir, `${draftId}.json`);
}

async function writeDraftFile(
  designDir: string,
  draft: StoredDesignDraft,
): Promise<void> {
  const filePath = getDraftFilePath(designDir, draft.id);
  await fs.promises.writeFile(
    filePath,
    JSON.stringify(draft, null, 2),
    "utf8",
  );
}

async function readDraftFile(
  designDir: string,
  draftId: string,
): Promise<StoredDesignDraft> {
  const filePath = getDraftFilePath(designDir, draftId);

  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(raw) as StoredDesignDraft;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DyadError(
        `Design draft not found: ${draftId}`,
        DyadErrorKind.NotFound,
      );
    }
    throw error;
  }
}

export async function getDesignDraftFile(
  appId: number,
  draftId: string,
): Promise<StoredDesignDraft> {
  const designDir = await getDesignDir(appId);
  return readDraftFile(designDir, draftId);
}

export async function getDesignDraftForChatFile(
  appId: number,
  chatId: number,
): Promise<StoredDesignDraft | null> {
  const designDir = await getDesignDir(appId);
  let files: string[];

  try {
    files = await fs.promises.readdir(designDir);
  } catch {
    return null;
  }

  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  const drafts = await Promise.all(
    jsonFiles.map(async (fileName) => {
      const raw = await fs.promises.readFile(path.join(designDir, fileName), "utf8");
      return JSON.parse(raw) as StoredDesignDraft;
    }),
  );

  const matching = drafts
    .filter((draft) => draft.chatId === chatId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return matching[0] ?? null;
}

export async function createDesignDraftFile(
  params: CreateDesignDraftParams,
): Promise<StoredDesignDraft> {
  validateHtmlDocument(params.html);
  const designDir = await getDesignDir(params.appId);
  const now = new Date().toISOString();
  const draft: StoredDesignDraft = {
    id: crypto.randomUUID(),
    appId: params.appId,
    chatId: params.chatId,
    title: params.title,
    brief: params.brief ?? null,
    deviceMode: params.deviceMode,
    html: params.html,
    createdAt: now,
    updatedAt: now,
  };

  await writeDraftFile(designDir, draft);
  return draft;
}

export async function updateDesignDraftFile(
  params: UpdateDesignDraftParams,
): Promise<StoredDesignDraft> {
  const designDir = await getDesignDir(params.appId);
  const current = await readDraftFile(designDir, params.draftId);

  const nextHtml = params.html ?? current.html;
  validateHtmlDocument(nextHtml);

  const updated: StoredDesignDraft = {
    ...current,
    title: params.title ?? current.title,
    brief: params.brief ?? current.brief,
    deviceMode: params.deviceMode ?? current.deviceMode,
    html: nextHtml,
    updatedAt: new Date().toISOString(),
  };

  await writeDraftFile(designDir, updated);
  return updated;
}

export function registerDesignHandlers() {
  createTypedHandler(designContracts.createDraft, async (_, params) => {
    const draft = await createDesignDraftFile(params);
    return draft.id;
  });

  createTypedHandler(designContracts.getDraft, async (_, { appId, draftId }) => {
    const designDir = await getDesignDir(appId);
    return readDraftFile(designDir, draftId);
  });

  createTypedHandler(
    designContracts.getDraftForChat,
    async (_, { appId, chatId }) => {
      return getDesignDraftForChatFile(appId, chatId);
    },
  );

  createTypedHandler(designContracts.updateDraft, async (_, params) => {
    await updateDesignDraftFile(params);
  });

  createTypedHandler(
    designContracts.respondToAskUserQuestion,
    async (_, params) => {
      resolveAskUserQuestionResponse(params.requestId, params.answers);
    },
  );
}
