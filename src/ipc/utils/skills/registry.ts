import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { getDyadAppPath, getUserDataPath } from "@/paths/paths";
import { IS_TEST_BUILD } from "../test_utils";
import { getInternalAppSubdirPath } from "../internal_app_dir";
import { parseFrontmatter } from "./frontmatter";

export type SkillSourceType = "bundled" | "user" | "project";

export interface ParsedSkill {
  name: string;
  description: string;
  whenToUse: string | null;
  allowedTools: string[];
  model: string | null;
  userInvocable: boolean;
  disableModelInvocation: boolean;
  rawContent: string;
  body: string;
}

export interface SkillRecord extends ParsedSkill {
  displayName: string;
  sourceType: SkillSourceType;
  sourcePath: string;
  skillFilePath: string;
  baseDir: string;
  overriddenBy: SkillSourceType[];
  overrides: SkillSourceType[];
}

export interface SkillLoadError {
  sourceType: SkillSourceType;
  directoryPath: string;
  skillName: string | null;
  reason: string;
}

export interface SkillsSnapshot {
  skills: SkillRecord[];
  loadErrors: SkillLoadError[];
  roots: Record<SkillSourceType, string>;
}

const SOURCE_PRECEDENCE: SkillSourceType[] = ["bundled", "user", "project"];

export function getBundledSkillsDir(): string {
  return path.resolve(process.cwd(), "skills", "bundled");
}

export function getUserSkillsDir(): string {
  if (IS_TEST_BUILD) {
    return path.join(getUserDataPath(), ".minerva", "skills");
  }
  return path.join(os.homedir(), ".minerva", "skills");
}

export function getProjectSkillsDir(appPath: string): string {
  return getInternalAppSubdirPath(appPath, "skills");
}

export function getSkillRoots(appPath?: string | null): Record<SkillSourceType, string> {
  return {
    bundled: getBundledSkillsDir(),
    user: getUserSkillsDir(),
    project: appPath ? getProjectSkillsDir(appPath) : getProjectSkillsDir(""),
  };
}

export async function loadSkillsSnapshot(params: {
  appPath?: string | null;
}): Promise<SkillsSnapshot> {
  const roots = {
    bundled: getBundledSkillsDir(),
    user: getUserSkillsDir(),
    project: params.appPath ? getProjectSkillsDir(params.appPath) : "",
  };

  const loadErrors: SkillLoadError[] = [];
  const skillsBySource = new Map<SkillSourceType, SkillRecord[]>();

  for (const sourceType of SOURCE_PRECEDENCE) {
    const root = roots[sourceType];
    if (!root) {
      skillsBySource.set(sourceType, []);
      continue;
    }

    const skills = await discoverSkillsInRoot({
      sourceType,
      root,
      loadErrors,
      skipIfMissing: sourceType === "project" && !params.appPath,
    });
    skillsBySource.set(sourceType, skills);
  }

  const allSkills = SOURCE_PRECEDENCE.flatMap(
    (sourceType) => skillsBySource.get(sourceType) ?? [],
  );
  const resolvedByName = new Map<string, SkillRecord>();

  for (const sourceType of SOURCE_PRECEDENCE) {
    for (const skill of skillsBySource.get(sourceType) ?? []) {
      resolvedByName.set(skill.name, skill);
    }
  }

  const groupedByName = new Map<string, SkillRecord[]>();
  for (const skill of allSkills) {
    const existing = groupedByName.get(skill.name);
    if (existing) {
      existing.push(skill);
    } else {
      groupedByName.set(skill.name, [skill]);
    }
  }

  for (const group of groupedByName.values()) {
    for (const skill of group) {
      skill.overrides = group
        .filter(
          (candidate) =>
            candidate.name === skill.name &&
            compareSourcePrecedence(candidate.sourceType, skill.sourceType) < 0,
        )
        .map((candidate) => candidate.sourceType);
      skill.overriddenBy = group
        .filter(
          (candidate) =>
            candidate.name === skill.name &&
            compareSourcePrecedence(candidate.sourceType, skill.sourceType) > 0,
        )
        .map((candidate) => candidate.sourceType);
    }
  }

  const skills = Array.from(resolvedByName.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  return {
    skills,
    loadErrors,
    roots,
  };
}

export async function resolveSkillByName(params: {
  appPath?: string | null;
  skillName: string;
}): Promise<SkillRecord | null> {
  const snapshot = await loadSkillsSnapshot({ appPath: params.appPath });
  return (
    snapshot.skills.find(
      (skill) => normalizeSkillName(skill.name) === normalizeSkillName(params.skillName),
    ) ?? null
  );
}

export function buildInjectedSkillPrompt(
  skill: Pick<
    SkillRecord,
    "name" | "description" | "sourceType" | "baseDir" | "body" | "whenToUse"
  >,
  args?: string,
): string {
  const sections = [
    `You must follow the skill "${skill.name}".`,
    `Skill source: ${skill.sourceType}`,
    `Skill base directory: ${skill.baseDir}`,
    `Skill description: ${skill.description}`,
  ];

  if (skill.whenToUse) {
    sections.push(`When to use: ${skill.whenToUse}`);
  }
  if (args?.trim()) {
    sections.push(`Skill arguments: ${args.trim()}`);
  }

  sections.push("Skill instructions:");
  sections.push(skill.body.trim());

  return sections.join("\n");
}

export function buildSkillRegistryPrompt(
  skills: Array<
    Pick<
      SkillRecord,
      | "name"
      | "description"
      | "whenToUse"
      | "sourceType"
      | "userInvocable"
      | "disableModelInvocation"
      | "allowedTools"
    >
  >,
): string {
  const invocableSkills = skills
    .filter((skill) => !skill.disableModelInvocation)
    .sort((left, right) => left.name.localeCompare(right.name));

  if (invocableSkills.length === 0) {
    return [
      "<available_skills>",
      "No reusable skills are currently available to this agent.",
      "Do not call the `skill` tool unless the user later provides a valid skill name through other context.",
      "</available_skills>",
    ].join("\n");
  }

  const sections = [
    "<available_skills>",
    "The following are the only valid skills you may invoke with the `skill` tool in this chat.",
    "Never guess a skill name. If none of these skills fit, do not call the `skill` tool.",
  ];

  for (const skill of invocableSkills) {
    sections.push(`- skill: ${skill.name}`);
    sections.push(`  source: ${skill.sourceType}`);
    sections.push(`  description: ${skill.description}`);
    if (skill.whenToUse) {
      sections.push(`  when_to_use: ${skill.whenToUse}`);
    }
    if (skill.userInvocable) {
      sections.push(`  slash_command: /${skill.name}`);
    }
    if (skill.allowedTools.length > 0) {
      sections.push(`  allowed_tools: ${skill.allowedTools.join(", ")}`);
    }
  }

  sections.push("</available_skills>");
  return sections.join("\n");
}

interface DiscoverSkillsInRootParams {
  sourceType: SkillSourceType;
  root: string;
  loadErrors: SkillLoadError[];
  skipIfMissing?: boolean;
}

async function discoverSkillsInRoot(
  params: DiscoverSkillsInRootParams,
): Promise<SkillRecord[]> {
  try {
    const stat = await fs.stat(params.root);
    if (!stat.isDirectory()) {
      return [];
    }
  } catch {
    if (params.skipIfMissing) {
      return [];
    }
    return [];
  }

  const entries = await fs.readdir(params.root, { withFileTypes: true });
  const skills: SkillRecord[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillDir = path.join(params.root, entry.name);
    const skillFilePath = path.join(skillDir, "SKILL.md");

    try {
      const parsedSkill = await parseSkillMarkdown(skillFilePath);
      skills.push({
        ...parsedSkill,
        displayName: parsedSkill.name,
        sourceType: params.sourceType,
        sourcePath: skillDir,
        skillFilePath,
        baseDir: skillDir,
        overriddenBy: [],
        overrides: [],
      });
    } catch (error) {
      params.loadErrors.push({
        sourceType: params.sourceType,
        directoryPath: skillDir,
        skillName: entry.name,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return skills;
}

export async function parseSkillMarkdown(skillFilePath: string): Promise<ParsedSkill> {
  let rawContent: string;
  try {
    rawContent = await fs.readFile(skillFilePath, "utf-8");
  } catch (error) {
    throw new DyadError(
      `Failed to read SKILL.md: ${error instanceof Error ? error.message : String(error)}`,
      DyadErrorKind.External,
    );
  }

  const { data, content } = parseFrontmatter(rawContent);
  const fallbackName = path.basename(path.dirname(skillFilePath));

  const name = readString(data.name) ?? fallbackName;
  const description = readString(data.description);

  if (!description) {
    throw new DyadError(
      "SKILL.md is missing a description in frontmatter",
      DyadErrorKind.Validation,
    );
  }

  return {
    name,
    description,
    whenToUse: readString(data.when_to_use),
    allowedTools: readStringArray(data["allowed-tools"]),
    model: readString(data.model),
    userInvocable: readBoolean(data["user-invocable"], true),
    disableModelInvocation: readBoolean(data["disable-model-invocation"], false),
    rawContent,
    body: content.trim(),
  };
}

export function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase();
}

function compareSourcePrecedence(
  left: SkillSourceType,
  right: SkillSourceType,
): number {
  return SOURCE_PRECEDENCE.indexOf(left) - SOURCE_PRECEDENCE.indexOf(right);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return fallback;
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function resolveAppPathForSkills(appPathOrRelative?: string | null): string | null {
  if (!appPathOrRelative) {
    return null;
  }
  return getDyadAppPath(appPathOrRelative);
}
