import { z } from "zod";
import {
  getDesignDraftForChatFile,
  updateDesignDraftFile,
} from "@/ipc/handlers/design_handlers";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type { ToolDefinition } from "./types";

const updateDesignDraftSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  brief: z.string().optional(),
  deviceMode: z.enum(["desktop", "tablet", "mobile"]).optional(),
  html: z
    .string()
    .min(1)
    .optional()
    .describe("Updated complete HTML design draft document"),
});

const DESCRIPTION = `Update the current chat's HTML design draft.

Use this when the user wants changes to an existing design draft.
Provide a full replacement HTML document when updating html.
`;

export const updateDesignDraftTool: ToolDefinition<
  z.infer<typeof updateDesignDraftSchema>
> = {
  name: "update_design_draft",
  description: DESCRIPTION,
  inputSchema: updateDesignDraftSchema,
  defaultConsent: "always",
  modifiesState: true,

  getConsentPreview: () => "Update current design draft",

  execute: async (args, ctx) => {
    const draft = await getDesignDraftForChatFile(ctx.appId, ctx.chatId);

    if (!draft) {
      throw new DyadError(
        "No design draft exists yet for this chat. Use create_design_draft first.",
        DyadErrorKind.Precondition,
      );
    }

    const updated = await updateDesignDraftFile({
      appId: ctx.appId,
      draftId: draft.id,
      title: args.title,
      brief: args.brief,
      deviceMode: args.deviceMode,
      html: args.html,
    });

    ctx.onXmlComplete(
      `<dyad-design-draft action="updated" draft-id="${updated.id}" title="${updated.title}"></dyad-design-draft>`,
    );

    return `Updated design draft "${updated.title}" (${updated.id}).`;
  },
};
