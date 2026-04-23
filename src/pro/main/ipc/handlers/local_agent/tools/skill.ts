import { z } from "zod";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import {
  buildInjectedSkillPrompt,
  resolveSkillByName,
} from "@/ipc/utils/skills/registry";
import {
  escapeXmlAttr,
  escapeXmlContent,
  type ToolDefinition,
} from "./types";

const skillSchema = z.object({
  skill: z.string().min(1).describe("The skill name to invoke"),
  args: z
    .string()
    .optional()
    .describe("Optional extra arguments or context for the skill"),
});

export const skillTool: ToolDefinition<z.infer<typeof skillSchema>> = {
  name: "skill",
  description:
    "Load a reusable skill from bundled, user, or project skills and inject its instructions into the current turn. Use this when the task matches a named reusable workflow instead of improvising from scratch.",
  inputSchema: skillSchema,
  defaultConsent: "always",

  getConsentPreview: (args) => `Invoke skill "${args.skill}"`,

  buildXml: (args, isComplete) => {
    if (!args.skill || isComplete) {
      return undefined;
    }

    return `<dyad-skill-call skill="${escapeXmlAttr(args.skill)}">${escapeXmlContent(args.args ?? "")}</dyad-skill-call>`;
  },

  execute: async (args, ctx) => {
    const skill = await resolveSkillByName({
      appPath: ctx.appPath,
      skillName: args.skill,
    });

    if (!skill) {
      throw new DyadError(
        `Skill not found: ${args.skill}`,
        DyadErrorKind.NotFound,
      );
    }

    if (skill.disableModelInvocation) {
      throw new DyadError(
        `Skill does not allow agent invocation: ${args.skill}`,
        DyadErrorKind.Precondition,
      );
    }

    const injected = buildInjectedSkillPrompt(skill, args.args);
    ctx.onXmlComplete(
      `<dyad-skill-result skill="${escapeXmlAttr(skill.name)}" source="${escapeXmlAttr(skill.sourceType)}">${escapeXmlContent(skill.description)}</dyad-skill-result>`,
    );
    return injected;
  },
};
