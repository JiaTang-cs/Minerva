import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { gitClone } from "../git_utils";
import {
  type SkillRecord,
  loadSkillsSnapshot,
  normalizeSkillName,
  parseSkillMarkdown,
  resolveAppPathForSkills,
  getUserSkillsDir,
} from "./registry";
import { parseSkillSource, type ParsedSkillSource } from "./source_parser";

const SEARCH_API_BASE = "https://skills.sh";
const MAX_INSTALL_FILE_COUNT = 200;
const MAX_INSTALL_TOTAL_BYTES = 512 * 1024;
const PRIORITY_ROOTS = [
  "",
  "skills",
  ".agents/skills",
  ".claude/skills",
] as const;

export interface SkillCatalogSearchResult {
  id: string;
  skillId: string;
  name: string;
  source: string;
  sourceUrl: string;
  installs: number;
  installable: boolean;
}

export interface InstalledSkillResult {
  skill: SkillRecord;
  installedTo: string;
}

export interface CatalogSkillDetail {
  skillId: string;
  name: string;
  source: string;
  sourceUrl: string;
  installCommand: string;
  rawContent: string;
  body: string;
  description: string;
  whenToUse: string | null;
  allowedTools: string[];
}

export async function searchSkillCatalog(
  query: string,
): Promise<SkillCatalogSearchResult[]> {
  const url = `${SEARCH_API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=10`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new DyadError(
      `Failed to search skills.sh (${response.status})`,
      DyadErrorKind.External,
    );
  }

  const payload = (await response.json()) as {
    skills?: Array<{
      id: string;
      skillId?: string;
      name: string;
      installs?: number;
      source: string;
    }>;
  };

  return (payload.skills ?? []).map((skill) => ({
    id: skill.id,
    skillId: skill.skillId ?? skill.name,
    name: skill.name,
    source: skill.source,
    sourceUrl: `https://github.com/${skill.source}`,
    installs: skill.installs ?? 0,
    installable: true,
  }));
}

export async function installSkillToUserDirectory(params: {
  appPath?: string | null;
  source: string;
  skillId: string;
}): Promise<InstalledSkillResult> {
  const preview = await loadCatalogSkillPreview({
    source: params.source,
    skillId: params.skillId,
  });

  try {
    const skillDir = preview.skillDir;
    const installName = sanitizeInstallName(path.basename(skillDir));
    const targetDir = path.join(getUserSkillsDir(), installName);

    await validateSkillDirectory(skillDir);
    await fs.rm(targetDir, { recursive: true, force: true });
    await copySkillDirectory(skillDir, targetDir, targetDir);

    const appPath = resolveAppPathForSkills(params.appPath);
    const snapshot = await loadSkillsSnapshot({ appPath });
    const skill =
      snapshot.skills.find(
        (candidate) =>
          candidate.sourceType === "user" &&
          normalizeSkillName(candidate.name) === normalizeSkillName(installName),
      ) ??
      snapshot.skills.find(
        (candidate) =>
          candidate.sourceType === "user" &&
          normalizeSkillName(candidate.name) === normalizeSkillName(params.skillId),
      );

    if (!skill) {
      throw new DyadError(
        "Skill installed but was not discoverable after refresh",
        DyadErrorKind.External,
      );
    }

    return {
      skill,
      installedTo: targetDir,
    };
  } finally {
    await fs.rm(preview.tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function loadCatalogSkillPreview(params: {
  source: string;
  skillId: string;
}): Promise<CatalogSkillDetail & { skillDir: string; tempDir: string }> {
  const parsedSource = parseSkillSource(params.source);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "minerva-skill-"));

  try {
    const localSourceDir = await materializeSource(tempDir, parsedSource);
    const skillDir = await discoverRequestedSkill(localSourceDir, params.skillId);
    const parsedSkill = await parseSkillMarkdown(path.join(skillDir, "SKILL.md"));

    return {
      skillId: params.skillId,
      name: parsedSkill.name,
      source: params.source,
      sourceUrl: buildSourceUrl(params.source),
      installCommand: buildInstallCommand(params.source, params.skillId),
      rawContent: parsedSkill.rawContent,
      body: parsedSkill.body,
      description: parsedSkill.description,
      whenToUse: parsedSkill.whenToUse,
      allowedTools: parsedSkill.allowedTools,
      skillDir,
      tempDir,
    };
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

async function materializeSource(
  tempDir: string,
  source: ParsedSkillSource,
): Promise<string> {
  if (source.type === "local") {
    return source.url;
  }

  const cloneDir = path.join(tempDir, "repo");
  await gitClone({
    path: cloneDir,
    url: source.url,
    depth: 1,
    singleBranch: true,
  });

  return source.subpath ? path.join(cloneDir, source.subpath) : cloneDir;
}

async function discoverRequestedSkill(
  sourceDir: string,
  requestedSkillId: string,
): Promise<string> {
  const desired = normalizeSkillName(requestedSkillId);
  const candidates = new Map<string, string>();

  for (const root of PRIORITY_ROOTS) {
    const rootDir = root ? path.join(sourceDir, root) : sourceDir;
    const discovered = await discoverSkillDirs(rootDir);
    for (const candidate of discovered) {
      const skillFilePath = path.join(candidate, "SKILL.md");
      const parsed = await parseSkillMarkdown(skillFilePath).catch(() => null);
      const names = [path.basename(candidate), parsed?.name].filter(
        (value): value is string => Boolean(value),
      );

      if (names.some((name) => normalizeSkillName(name) === desired)) {
        candidates.set(candidate, candidate);
      }
    }

    if (candidates.size > 0) {
      break;
    }
  }

  if (candidates.size === 0) {
    throw new DyadError(
      `Could not locate SKILL.md for ${requestedSkillId}`,
      DyadErrorKind.NotFound,
    );
  }

  return Array.from(candidates.values())[0]!;
}

async function discoverSkillDirs(rootDir: string): Promise<string[]> {
  try {
    const rootStat = await fs.stat(rootDir);
    if (!rootStat.isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  const skillFile = path.join(rootDir, "SKILL.md");
  try {
    const stat = await fs.stat(skillFile);
    if (stat.isFile()) {
      return [rootDir];
    }
  } catch {}

  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(rootDir, entry.name));
}

async function validateSkillDirectory(skillDir: string): Promise<void> {
  const skillFilePath = path.join(skillDir, "SKILL.md");
  await parseSkillMarkdown(skillFilePath);

  let fileCount = 0;
  let totalBytes = 0;

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      fileCount += 1;
      const stat = await fs.stat(fullPath);
      totalBytes += stat.size;
    }
  }

  await walk(skillDir);

  if (fileCount > MAX_INSTALL_FILE_COUNT || totalBytes > MAX_INSTALL_TOTAL_BYTES) {
    throw new DyadError(
      "Skill payload is too large to install safely",
      DyadErrorKind.Validation,
    );
  }
}

async function copySkillDirectory(
  sourceDir: string,
  targetDir: string,
  baseTargetDir: string,
): Promise<void> {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== "SKILL.md") {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    ensurePathIsSafe(baseTargetDir, targetPath);

    if (entry.isDirectory()) {
      await copySkillDirectory(sourcePath, targetPath, baseTargetDir);
      continue;
    }

    const stat = await fs.lstat(sourcePath);
    if (stat.isSymbolicLink()) {
      continue;
    }

    await fs.copyFile(sourcePath, targetPath);
  }
}

function ensurePathIsSafe(baseDir: string, targetPath: string): void {
  const normalizedBase = path.resolve(baseDir);
  const normalizedTarget = path.resolve(targetPath);
  if (
    normalizedTarget !== normalizedBase &&
    !normalizedTarget.startsWith(`${normalizedBase}${path.sep}`)
  ) {
    throw new DyadError(
      "Skill install attempted to write outside the skills directory",
      DyadErrorKind.Validation,
    );
  }
}

function sanitizeInstallName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "") || "skill";
}

function buildSourceUrl(source: string): string {
  if (path.isAbsolute(source) || source.startsWith("./") || source.startsWith("../")) {
    return source;
  }
  return source.startsWith("http://") || source.startsWith("https://")
    ? source
    : `https://github.com/${source}`;
}

function buildInstallCommand(source: string, skillId: string): string {
  return `npx skills add https://github.com/${source} --skill ${skillId}`;
}
