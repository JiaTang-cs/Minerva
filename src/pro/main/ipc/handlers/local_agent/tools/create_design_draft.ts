import { z } from "zod";
import { createDesignDraftFile } from "@/ipc/handlers/design_handlers";
import type { ToolDefinition } from "./types";

const createDesignDraftSchema = z.object({
  title: z.string().min(1).max(120),
  brief: z
    .string()
    .optional()
    .describe("Short summary of the clarified design intent"),
  deviceMode: z.enum(["desktop", "tablet", "mobile"]).default("desktop"),
  html: z.string().min(1).describe("Complete HTML design draft document"),
});

const DESCRIPTION = `Create the first HTML design draft for the current chat.

The html field must follow these rules:
- complete document with <!DOCTYPE html>, <html>, <head>, and <body>
- no <script> tags
- no runtime bridge code
- use semantic design tokens instead of hardcoded colors
- this should be the authored design draft, not the preview platform shell
`;

export const createDesignDraftTool: ToolDefinition<
  z.infer<typeof createDesignDraftSchema>
> = {
  name: "create_design_draft",
  description: DESCRIPTION,
  inputSchema: createDesignDraftSchema,
  defaultConsent: "always",
  modifiesState: true,

  getConsentPreview: (args) => `Create design draft "${args.title}"`,

  execute: async (args, ctx) => {
    const draft = await createDesignDraftFile({
      appId: ctx.appId,
      chatId: ctx.chatId,
      title: args.title,
      brief: args.brief,
      deviceMode: args.deviceMode,
      html: args.html,
    });

    ctx.onXmlComplete(
      `<dyad-design-draft action="created" draft-id="${draft.id}" title="${draft.title}"></dyad-design-draft>`,
    );

    return `Created design draft "${draft.title}" with id ${draft.id}.`;
  },
};
