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
  type DesignFlow,
  type DesignFlowPage,
  type DraftComponent,
  type CreateDesignDraftParams,
  type UpdateDesignDraftParams,
  type CreateDraftComponentParams,
  type UpdateDraftComponentParams,
} from "../types/design";
import { ensureInternalAppDirGitignored } from "./gitignoreUtils";
import { resolveAskUserQuestionResponse } from "../../pro/main/ipc/handlers/local_agent/tool_definitions";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { getInternalAppSubdirPath } from "../utils/internal_app_dir";

const DESIGN_DIR_NAME = "designs";
const DRAFTS_DIR_NAME = "drafts";
const FLOWS_DIR_NAME = "flows";
const FLOW_PAGES_DIR_NAME = "flow-pages";
const COMPONENTS_DIR_NAME = "components";

type StoredDesignDraft = DesignDraft;
type StoredDesignFlow = DesignFlow;
type StoredDesignFlowPage = DesignFlowPage;
type StoredDraftComponent = DraftComponent;

interface DesignStoragePaths {
  root: string;
  draftsDir: string;
  flowsDir: string;
  flowPagesDir: string;
  componentsDir: string;
}

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

async function getDesignStoragePaths(
  appId: number,
): Promise<DesignStoragePaths> {
  const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
  if (!app) {
    throw new DyadError(`App not found: ${appId}`, DyadErrorKind.NotFound);
  }

  const appPath = getDyadAppPath(app.path);
  const root = getInternalAppSubdirPath(appPath, DESIGN_DIR_NAME);
  const storagePaths: DesignStoragePaths = {
    root,
    draftsDir: path.join(root, DRAFTS_DIR_NAME),
    flowsDir: path.join(root, FLOWS_DIR_NAME),
    flowPagesDir: path.join(root, FLOW_PAGES_DIR_NAME),
    componentsDir: path.join(root, COMPONENTS_DIR_NAME),
  };

  await Promise.all(
    Object.values(storagePaths).map((dirPath) =>
      fs.promises.mkdir(dirPath, { recursive: true }),
    ),
  );
  await ensureInternalAppDirGitignored(appPath);
  return storagePaths;
}

function getDraftFilePath(paths: DesignStoragePaths, draftId: string) {
  return path.join(paths.draftsDir, `${draftId}.json`);
}

function getLegacyDraftFilePath(paths: DesignStoragePaths, draftId: string) {
  return path.join(paths.root, `${draftId}.json`);
}

function getFlowFilePath(paths: DesignStoragePaths, flowId: string) {
  return path.join(paths.flowsDir, `${flowId}.json`);
}

function getFlowPageFilePath(paths: DesignStoragePaths, pageId: string) {
  return path.join(paths.flowPagesDir, `${pageId}.json`);
}

function getComponentFilePath(paths: DesignStoragePaths, componentId: string) {
  return path.join(paths.componentsDir, `${componentId}.json`);
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.promises.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function readJsonFile<T>(
  filePath: string,
  notFoundLabel: string,
): Promise<T> {
  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DyadError(
        `${notFoundLabel} not found: ${path.basename(filePath, ".json")}`,
        DyadErrorKind.NotFound,
      );
    }
    throw error;
  }
}

async function readJsonFilesInDir<T>(dirPath: string): Promise<T[]> {
  let fileNames: string[];
  try {
    fileNames = await fs.promises.readdir(dirPath);
  } catch {
    return [];
  }

  const jsonFiles = fileNames.filter((fileName) => fileName.endsWith(".json"));
  return Promise.all(
    jsonFiles.map(async (fileName) => {
      const raw = await fs.promises.readFile(
        path.join(dirPath, fileName),
        "utf8",
      );
      return JSON.parse(raw) as T;
    }),
  );
}

async function readDraftFile(
  paths: DesignStoragePaths,
  draftId: string,
): Promise<StoredDesignDraft> {
  const nextPath = getDraftFilePath(paths, draftId);

  try {
    return await readJsonFile<StoredDesignDraft>(nextPath, "Design draft");
  } catch (error) {
    if (
      !(error instanceof DyadError) ||
      error.kind !== DyadErrorKind.NotFound
    ) {
      throw error;
    }
  }

  return readJsonFile<StoredDesignDraft>(
    getLegacyDraftFilePath(paths, draftId),
    "Design draft",
  );
}

async function writeDraftFile(
  paths: DesignStoragePaths,
  draft: StoredDesignDraft,
): Promise<void> {
  await writeJsonFile(getDraftFilePath(paths, draft.id), draft);
}

async function readFlowFile(
  paths: DesignStoragePaths,
  flowId: string,
): Promise<StoredDesignFlow> {
  return readJsonFile<StoredDesignFlow>(
    getFlowFilePath(paths, flowId),
    "Design flow",
  );
}

async function writeFlowFile(
  paths: DesignStoragePaths,
  flow: StoredDesignFlow,
): Promise<void> {
  await writeJsonFile(getFlowFilePath(paths, flow.id), flow);
}

export async function updateDesignFlowStatusFile(params: {
  appId: number;
  flowId: string;
  status: DesignFlow["status"];
  title?: string;
}): Promise<StoredDesignFlow> {
  const paths = await getDesignStoragePaths(params.appId);
  const current = await readFlowFile(paths, params.flowId);
  const updated: StoredDesignFlow = {
    ...current,
    status: params.status,
    title: params.title ?? current.title,
    updatedAt: new Date().toISOString(),
  };

  await writeFlowFile(paths, updated);
  return updated;
}

async function writeFlowPageFile(
  paths: DesignStoragePaths,
  page: StoredDesignFlowPage,
): Promise<void> {
  await writeJsonFile(getFlowPageFilePath(paths, page.id), page);
}

async function readDraftComponentFileInternal(
  paths: DesignStoragePaths,
  componentId: string,
): Promise<StoredDraftComponent> {
  return readJsonFile<StoredDraftComponent>(
    getComponentFilePath(paths, componentId),
    "Draft component",
  );
}

async function writeDraftComponentFileInternal(
  paths: DesignStoragePaths,
  component: StoredDraftComponent,
): Promise<void> {
  await writeJsonFile(getComponentFilePath(paths, component.id), component);
}

async function readAllDrafts(
  paths: DesignStoragePaths,
): Promise<StoredDesignDraft[]> {
  const [newDrafts, legacyDrafts] = await Promise.all([
    readJsonFilesInDir<StoredDesignDraft>(paths.draftsDir),
    readJsonFilesInDir<StoredDesignDraft>(paths.root),
  ]);

  const deduped = new Map<string, StoredDesignDraft>();
  for (const draft of [...legacyDrafts, ...newDrafts]) {
    deduped.set(draft.id, draft);
  }
  return [...deduped.values()];
}

async function readAllFlows(
  paths: DesignStoragePaths,
): Promise<StoredDesignFlow[]> {
  return readJsonFilesInDir<StoredDesignFlow>(paths.flowsDir);
}

async function readAllFlowPages(
  paths: DesignStoragePaths,
): Promise<StoredDesignFlowPage[]> {
  return readJsonFilesInDir<StoredDesignFlowPage>(paths.flowPagesDir);
}

async function readAllDraftComponents(
  paths: DesignStoragePaths,
): Promise<StoredDraftComponent[]> {
  return readJsonFilesInDir<StoredDraftComponent>(paths.componentsDir);
}

async function getFlowPagesByFlowId(
  paths: DesignStoragePaths,
  flowId: string,
): Promise<StoredDesignFlowPage[]> {
  const pages = await readAllFlowPages(paths);
  return pages
    .filter((page) => page.flowId === flowId)
    .sort(
      (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt),
    );
}

async function getFlowByRootDraftId(
  paths: DesignStoragePaths,
  rootDraftId: string,
): Promise<StoredDesignFlow | null> {
  const flows = await readAllFlows(paths);
  return flows.find((flow) => flow.rootDraftId === rootDraftId) ?? null;
}

async function createFlowForDraft(
  paths: DesignStoragePaths,
  draft: StoredDesignDraft,
): Promise<StoredDesignFlow> {
  const existing = await getFlowByRootDraftId(paths, draft.id);
  if (existing) {
    if (draft.flowId !== existing.id) {
      await writeDraftFile(paths, { ...draft, flowId: existing.id });
    }
    return existing;
  }

  const now = new Date().toISOString();
  const flow: StoredDesignFlow = {
    id: crypto.randomUUID(),
    appId: draft.appId,
    chatId: draft.chatId,
    title: draft.title,
    rootDraftId: draft.id,
    status: "ready",
    createdAt: now,
    updatedAt: now,
  };

  const rootPage: StoredDesignFlowPage = {
    id: crypto.randomUUID(),
    flowId: flow.id,
    draftId: draft.id,
    title: draft.title,
    prompt: draft.brief ?? null,
    role: "root",
    order: 0,
    sourceDraftId: null,
    status: "ready",
    createdAt: now,
    updatedAt: now,
  };

  await Promise.all([
    writeFlowFile(paths, flow),
    writeFlowPageFile(paths, rootPage),
    writeDraftFile(paths, { ...draft, flowId: flow.id }),
  ]);

  return flow;
}

async function ensureFlowForChat(
  paths: DesignStoragePaths,
  appId: number,
  chatId: number,
): Promise<StoredDesignFlow | null> {
  const flows = await readAllFlows(paths);
  const existingFlow = flows
    .filter((flow) => flow.appId === appId && flow.chatId === chatId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (existingFlow) {
    return existingFlow;
  }

  const latestDraft = (await readAllDrafts(paths))
    .filter((draft) => draft.appId === appId && draft.chatId === chatId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!latestDraft) {
    return null;
  }

  return createFlowForDraft(paths, latestDraft);
}

async function getFlowForDraft(
  paths: DesignStoragePaths,
  draft: StoredDesignDraft,
): Promise<StoredDesignFlow> {
  if (draft.flowId) {
    try {
      return await readFlowFile(paths, draft.flowId);
    } catch (error) {
      if (
        !(error instanceof DyadError) ||
        error.kind !== DyadErrorKind.NotFound
      ) {
        throw error;
      }
    }
  }

  return createFlowForDraft(paths, draft);
}

export async function getDesignDraftFile(
  appId: number,
  draftId: string,
): Promise<StoredDesignDraft> {
  const paths = await getDesignStoragePaths(appId);
  return readDraftFile(paths, draftId);
}

export async function getDesignDraftForChatFile(
  appId: number,
  chatId: number,
): Promise<StoredDesignDraft | null> {
  const paths = await getDesignStoragePaths(appId);
  const flow = await ensureFlowForChat(paths, appId, chatId);
  if (!flow) {
    return null;
  }

  return readDraftFile(paths, flow.rootDraftId);
}

export async function getDesignFlowForChatFile(
  appId: number,
  chatId: number,
): Promise<StoredDesignFlow | null> {
  const paths = await getDesignStoragePaths(appId);
  return ensureFlowForChat(paths, appId, chatId);
}

export async function listFlowPagesFile(
  appId: number,
  flowId: string,
): Promise<StoredDesignFlowPage[]> {
  const paths = await getDesignStoragePaths(appId);
  return getFlowPagesByFlowId(paths, flowId);
}

export async function listDraftComponentsFile(
  appId: number,
  flowId: string,
): Promise<StoredDraftComponent[]> {
  const paths = await getDesignStoragePaths(appId);
  const components = await readAllDraftComponents(paths);
  return components
    .filter((component) => component.flowId === flowId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getDraftComponentFile(
  appId: number,
  componentId: string,
): Promise<StoredDraftComponent> {
  const paths = await getDesignStoragePaths(appId);
  return readDraftComponentFileInternal(paths, componentId);
}

export async function createDesignDraftFile(
  params: CreateDesignDraftParams,
): Promise<StoredDesignDraft> {
  validateHtmlDocument(params.html);
  const paths = await getDesignStoragePaths(params.appId);
  const now = new Date().toISOString();
  const flowId = crypto.randomUUID();
  const draftId = crypto.randomUUID();

  const draft: StoredDesignDraft = {
    id: draftId,
    appId: params.appId,
    chatId: params.chatId,
    title: params.title,
    brief: params.brief ?? null,
    deviceMode: params.deviceMode,
    html: params.html,
    flowId,
    createdAt: now,
    updatedAt: now,
  };

  const flow: StoredDesignFlow = {
    id: flowId,
    appId: params.appId,
    chatId: params.chatId,
    title: params.title,
    rootDraftId: draftId,
    status: "ready",
    createdAt: now,
    updatedAt: now,
  };

  const rootPage: StoredDesignFlowPage = {
    id: crypto.randomUUID(),
    flowId,
    draftId,
    title: params.title,
    prompt: params.brief ?? null,
    role: "root",
    order: 0,
    sourceDraftId: null,
    status: "ready",
    createdAt: now,
    updatedAt: now,
  };

  await Promise.all([
    writeDraftFile(paths, draft),
    writeFlowFile(paths, flow),
    writeFlowPageFile(paths, rootPage),
  ]);

  return draft;
}

export async function updateDesignDraftFile(
  params: UpdateDesignDraftParams,
): Promise<StoredDesignDraft> {
  const paths = await getDesignStoragePaths(params.appId);
  const current = await readDraftFile(paths, params.draftId);

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

  await writeDraftFile(paths, updated);

  const pages = await readAllFlowPages(paths);
  const page = pages.find((entry) => entry.draftId === updated.id);
  if (page) {
    await writeFlowPageFile(paths, {
      ...page,
      title: updated.title,
      prompt: updated.brief ?? page.prompt,
      updatedAt: updated.updatedAt,
    });
  }

  if (updated.flowId) {
    try {
      const flow = await readFlowFile(paths, updated.flowId);
      await writeFlowFile(paths, {
        ...flow,
        title: page?.role === "root" ? updated.title : flow.title,
        updatedAt: updated.updatedAt,
      });
    } catch (error) {
      if (
        !(error instanceof DyadError) ||
        error.kind !== DyadErrorKind.NotFound
      ) {
        throw error;
      }
    }
  }

  return updated;
}

export async function createGeneratedFlowPageFile(params: {
  appId: number;
  sourceDraftId: string;
  title: string;
  prompt?: string;
  deviceMode: DesignDraft["deviceMode"];
  html: string;
}): Promise<{ draft: StoredDesignDraft; page: StoredDesignFlowPage }> {
  validateHtmlDocument(params.html);
  const paths = await getDesignStoragePaths(params.appId);
  const sourceDraft = await readDraftFile(paths, params.sourceDraftId);
  const flow = await getFlowForDraft(paths, sourceDraft);
  const pages = await getFlowPagesByFlowId(paths, flow.id);
  const now = new Date().toISOString();
  const draftId = crypto.randomUUID();

  const draft: StoredDesignDraft = {
    id: draftId,
    appId: params.appId,
    chatId: flow.chatId,
    title: params.title,
    brief: params.prompt ?? null,
    deviceMode: params.deviceMode,
    html: params.html,
    flowId: flow.id,
    createdAt: now,
    updatedAt: now,
  };

  const page: StoredDesignFlowPage = {
    id: crypto.randomUUID(),
    flowId: flow.id,
    draftId,
    title: params.title,
    prompt: params.prompt ?? null,
    role: "generated",
    order: pages.length,
    sourceDraftId: params.sourceDraftId,
    status: "ready",
    createdAt: now,
    updatedAt: now,
  };

  await Promise.all([
    writeDraftFile(paths, draft),
    writeFlowPageFile(paths, page),
    writeFlowFile(paths, { ...flow, updatedAt: now }),
  ]);

  return { draft, page };
}

export async function createDraftComponentFile(
  params: CreateDraftComponentParams,
): Promise<StoredDraftComponent> {
  const paths = await getDesignStoragePaths(params.appId);
  const draft = await readDraftFile(paths, params.draftId);
  const flow = await getFlowForDraft(paths, draft);
  const now = new Date().toISOString();

  const component: StoredDraftComponent = {
    id: crypto.randomUUID(),
    appId: params.appId,
    flowId: flow.id,
    draftId: params.draftId,
    name: params.name,
    description: params.description ?? null,
    htmlTemplate: params.htmlTemplate,
    previewHtml: params.previewHtml ?? null,
    props: params.props,
    createdAt: now,
    updatedAt: now,
  };

  await Promise.all([
    writeDraftComponentFileInternal(paths, component),
    writeFlowFile(paths, { ...flow, updatedAt: now }),
  ]);

  return component;
}

export async function updateDraftComponentFile(
  params: UpdateDraftComponentParams,
): Promise<StoredDraftComponent> {
  const paths = await getDesignStoragePaths(params.appId);
  const current = await readDraftComponentFileInternal(
    paths,
    params.componentId,
  );
  const updated: StoredDraftComponent = {
    ...current,
    name: params.name ?? current.name,
    description:
      params.description !== undefined
        ? params.description
        : current.description,
    htmlTemplate: params.htmlTemplate ?? current.htmlTemplate,
    previewHtml: params.previewHtml ?? current.previewHtml,
    props: params.props ?? current.props,
    updatedAt: new Date().toISOString(),
  };

  await writeDraftComponentFileInternal(paths, updated);
  return updated;
}

export function registerDesignHandlers() {
  createTypedHandler(designContracts.createDraft, async (_, params) => {
    const draft = await createDesignDraftFile(params);
    return draft.id;
  });

  createTypedHandler(
    designContracts.getDraft,
    async (_, { appId, draftId }) => {
      return getDesignDraftFile(appId, draftId);
    },
  );

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
    designContracts.getFlowForChat,
    async (_, { appId, chatId }) => {
      return getDesignFlowForChatFile(appId, chatId);
    },
  );

  createTypedHandler(
    designContracts.listFlowPages,
    async (_, { appId, flowId }) => {
      return listFlowPagesFile(appId, flowId);
    },
  );

  createTypedHandler(
    designContracts.listDraftComponents,
    async (_, { appId, flowId }) => {
      return listDraftComponentsFile(appId, flowId);
    },
  );

  createTypedHandler(
    designContracts.getDraftComponent,
    async (_, { appId, componentId }) => {
      return getDraftComponentFile(appId, componentId);
    },
  );

  createTypedHandler(
    designContracts.createDraftComponent,
    async (_, params) => {
      return createDraftComponentFile(params);
    },
  );

  createTypedHandler(
    designContracts.updateDraftComponent,
    async (_, params) => {
      return updateDraftComponentFile(params);
    },
  );

  createTypedHandler(
    designContracts.respondToAskUserQuestion,
    async (_, params) => {
      resolveAskUserQuestionResponse(params.requestId, params.answers);
    },
  );
}
