import { db } from "@/db";
import { apps } from "@/db/schema";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { eq } from "drizzle-orm";
import { createTypedHandler } from "./base";
import { skillsContracts } from "../types/skills";
import {
  resolveAppPathForSkills,
  loadSkillsSnapshot,
} from "../utils/skills/registry";
import {
  installSkillToUserDirectory,
  loadCatalogSkillPreview,
  searchSkillCatalog,
} from "../utils/skills/search_install";

async function resolveAppPath(appId?: number | null): Promise<string | null> {
  if (!appId) {
    return null;
  }

  const app = await db.query.apps.findFirst({
    where: eq(apps.id, appId),
  });

  if (!app) {
    throw new DyadError(`App not found: ${appId}`, DyadErrorKind.NotFound);
  }

  return resolveAppPathForSkills(app.path);
}

export function registerSkillsHandlers() {
  createTypedHandler(skillsContracts.list, async (_, input) => {
    const appPath = await resolveAppPath(input.appId ?? null);
    return loadSkillsSnapshot({ appPath });
  });

  createTypedHandler(skillsContracts.refresh, async (_, input) => {
    const appPath = await resolveAppPath(input.appId ?? null);
    return loadSkillsSnapshot({ appPath });
  });

  createTypedHandler(skillsContracts.searchCatalog, async (_, input) => {
    return searchSkillCatalog(input.query);
  });

  createTypedHandler(skillsContracts.install, async (_, input) => {
    const appPath = await resolveAppPath(input.appId ?? null);
    return installSkillToUserDirectory({
      appPath,
      source: input.source,
      skillId: input.skillId,
    });
  });

  createTypedHandler(skillsContracts.getCatalogDetail, async (_, input) => {
    const preview = await loadCatalogSkillPreview({
      source: input.source,
      skillId: input.skillId,
    });

    return {
      skillId: preview.skillId,
      name: preview.name,
      source: preview.source,
      sourceUrl: preview.sourceUrl,
      installCommand: preview.installCommand,
      rawContent: preview.rawContent,
      body: preview.body,
      description: preview.description,
      whenToUse: preview.whenToUse,
      allowedTools: preview.allowedTools,
    };
  });
}
