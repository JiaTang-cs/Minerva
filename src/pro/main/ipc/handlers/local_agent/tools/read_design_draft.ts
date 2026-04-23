import { z } from "zod";
import {
  getDesignDraftFile,
  getDesignDraftForChatFile,
} from "@/ipc/handlers/design_handlers";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type { ToolDefinition } from "./types";

const readDesignDraftSchema = z.object({
  draftId: z.string().optional(),
});

const DESCRIPTION = `Read a design draft's HTML and metadata.

Use this for flow expansion, comparing drafts, or when the user explicitly
references a specific design page.
`;

export const readDesignDraftTool: ToolDefinition<
  z.infer<typeof readDesignDraftSchema>
> = {
  name: "read_design_draft",
  description: DESCRIPTION,
  inputSchema: readDesignDraftSchema,
  defaultConsent: "always",
  modifiesState: false,

  execute: async (args, ctx) => {
    const draft = args.draftId
      ? await getDesignDraftFile(ctx.appId, args.draftId)
      : await getDesignDraftForChatFile(ctx.appId, ctx.chatId);

    if (!draft) {
      throw new DyadError(
        "No design draft exists yet for this chat.",
        DyadErrorKind.Precondition,
      );
    }

    return [
      "Design draft metadata:",
      JSON.stringify(
        {
          id: draft.id,
          title: draft.title,
          brief: draft.brief,
          deviceMode: draft.deviceMode,
          flowId: draft.flowId ?? null,
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        },
        null,
        2,
      ),
      "",
      "HTML:",
      draft.html,
    ].join("\n");
  },
};
