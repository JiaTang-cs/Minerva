import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";

export const SkillSourceTypeSchema = z.enum(["bundled", "user", "project"]);

export const SkillSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  whenToUse: z.string().nullable(),
  allowedTools: z.array(z.string()),
  model: z.string().nullable(),
  userInvocable: z.boolean(),
  disableModelInvocation: z.boolean(),
  rawContent: z.string(),
  body: z.string(),
  sourceType: SkillSourceTypeSchema,
  sourcePath: z.string(),
  skillFilePath: z.string(),
  baseDir: z.string(),
  overrides: z.array(SkillSourceTypeSchema),
  overriddenBy: z.array(SkillSourceTypeSchema),
});

export const SkillLoadErrorSchema = z.object({
  sourceType: SkillSourceTypeSchema,
  directoryPath: z.string(),
  skillName: z.string().nullable(),
  reason: z.string(),
});

export const SkillsSnapshotSchema = z.object({
  skills: z.array(SkillSchema),
  loadErrors: z.array(SkillLoadErrorSchema),
  roots: z.object({
    bundled: z.string(),
    user: z.string(),
    project: z.string(),
  }),
});

export const SkillCatalogSearchResultSchema = z.object({
  id: z.string(),
  skillId: z.string(),
  name: z.string(),
  source: z.string(),
  sourceUrl: z.string(),
  installs: z.number(),
  installable: z.boolean(),
});

export const InstalledSkillResultSchema = z.object({
  skill: SkillSchema,
  installedTo: z.string(),
});

export const CatalogSkillDetailSchema = z.object({
  skillId: z.string(),
  name: z.string(),
  source: z.string(),
  sourceUrl: z.string(),
  installCommand: z.string(),
  rawContent: z.string(),
  body: z.string(),
  description: z.string(),
  whenToUse: z.string().nullable(),
  allowedTools: z.array(z.string()),
});

export const SkillsAppParamsSchema = z.object({
  appId: z.number().nullable().optional(),
});

export const SearchSkillCatalogInputSchema = z.object({
  query: z.string().min(1),
});

export const InstallSkillInputSchema = z.object({
  appId: z.number().nullable().optional(),
  source: z.string().min(1),
  skillId: z.string().min(1),
});

export const GetCatalogSkillDetailInputSchema = z.object({
  source: z.string().min(1),
  skillId: z.string().min(1),
});

export type Skill = z.infer<typeof SkillSchema>;
export type SkillSourceType = z.infer<typeof SkillSourceTypeSchema>;
export type SkillLoadError = z.infer<typeof SkillLoadErrorSchema>;
export type SkillsSnapshot = z.infer<typeof SkillsSnapshotSchema>;
export type SkillCatalogSearchResult = z.infer<
  typeof SkillCatalogSearchResultSchema
>;
export type InstalledSkillResult = z.infer<typeof InstalledSkillResultSchema>;
export type CatalogSkillDetail = z.infer<typeof CatalogSkillDetailSchema>;

export const skillsContracts = {
  list: defineContract({
    channel: "skills:list",
    input: SkillsAppParamsSchema,
    output: SkillsSnapshotSchema,
  }),
  refresh: defineContract({
    channel: "skills:refresh",
    input: SkillsAppParamsSchema,
    output: SkillsSnapshotSchema,
  }),
  searchCatalog: defineContract({
    channel: "skills:search-catalog",
    input: SearchSkillCatalogInputSchema,
    output: z.array(SkillCatalogSearchResultSchema),
  }),
  install: defineContract({
    channel: "skills:install",
    input: InstallSkillInputSchema,
    output: InstalledSkillResultSchema,
  }),
  getCatalogDetail: defineContract({
    channel: "skills:get-catalog-detail",
    input: GetCatalogSkillDetailInputSchema,
    output: CatalogSkillDetailSchema,
  }),
} as const;

export const skillsClient = createClient(skillsContracts);
