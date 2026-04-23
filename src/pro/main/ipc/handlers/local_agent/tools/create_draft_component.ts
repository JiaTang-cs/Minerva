import { z } from "zod";
import {
  createDraftComponentFile,
  getDesignDraftForChatFile,
} from "@/ipc/handlers/design_handlers";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type { ToolDefinition } from "./types";
import { escapeXmlAttr } from "./types";

const draftComponentPropSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.string().min(1).max(80),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
});

const createDraftComponentSchema = z.object({
  draftId: z.string().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  htmlTemplate: z.string().min(1),
  previewHtml: z.string().optional(),
  props: z.array(draftComponentPropSchema).default([]),
});

const DESCRIPTION = `Create a reusable component from a design page fragment.

Use this before multi-page generation to store shared UI such as nav bars,
footers, cards, or common section shells.
`;

export const createDraftComponentTool: ToolDefinition<
  z.infer<typeof createDraftComponentSchema>
> = {
  name: "create_draft_component",
  description: DESCRIPTION,
  inputSchema: createDraftComponentSchema,
  defaultConsent: "always",
  modifiesState: true,

  getConsentPreview: (args) => `Create reusable component "${args.name}"`,

  execute: async (args, ctx) => {
    const sourceDraftId =
      args.draftId ??
      (await getDesignDraftForChatFile(ctx.appId, ctx.chatId))?.id;

    if (!sourceDraftId) {
      throw new DyadError(
        "No design draft exists yet for this chat. Create or select a source draft first.",
        DyadErrorKind.Precondition,
      );
    }

    const component = await createDraftComponentFile({
      appId: ctx.appId,
      draftId: sourceDraftId,
      name: args.name,
      description: args.description,
      htmlTemplate: args.htmlTemplate,
      previewHtml: args.previewHtml,
      props: args.props,
    });

    ctx.onXmlComplete(
      `<dyad-design-component action="created" component-id="${component.id}" draft-id="${component.draftId}" name="${escapeXmlAttr(component.name)}"></dyad-design-component>`,
    );

    return `Created draft component JSON:\n${JSON.stringify(component, null, 2)}`;
  },
};
