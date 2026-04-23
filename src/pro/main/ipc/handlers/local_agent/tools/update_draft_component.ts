import { z } from "zod";
import { updateDraftComponentFile } from "@/ipc/handlers/design_handlers";
import type { ToolDefinition } from "./types";
import { escapeXmlAttr } from "./types";

const draftComponentPropSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.string().min(1).max(80),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
});

const updateDraftComponentSchema = z.object({
  componentId: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  htmlTemplate: z.string().min(1).optional(),
  previewHtml: z.string().optional(),
  props: z.array(draftComponentPropSchema).optional(),
});

const DESCRIPTION = `Update a reusable design component's template, preview, or props.

Use this when you need to fix missing bindings or refine a shared component
before generating more pages.
`;

export const updateDraftComponentTool: ToolDefinition<
  z.infer<typeof updateDraftComponentSchema>
> = {
  name: "update_draft_component",
  description: DESCRIPTION,
  inputSchema: updateDraftComponentSchema,
  defaultConsent: "always",
  modifiesState: true,

  getConsentPreview: (args) =>
    `Update reusable component ${args.componentId}`,

  execute: async (args, ctx) => {
    const component = await updateDraftComponentFile({
      appId: ctx.appId,
      componentId: args.componentId,
      name: args.name,
      description: args.description,
      htmlTemplate: args.htmlTemplate,
      previewHtml: args.previewHtml,
      props: args.props,
    });

    ctx.onXmlComplete(
      `<dyad-design-component action="updated" component-id="${component.id}" draft-id="${component.draftId}" name="${escapeXmlAttr(component.name)}"></dyad-design-component>`,
    );

    return `Updated draft component JSON:\n${JSON.stringify(component, null, 2)}`;
  },
};
