import { z } from "zod";
import { getDraftComponentFile } from "@/ipc/handlers/design_handlers";
import type { ToolDefinition } from "./types";

const readDraftComponentSchema = z.object({
  componentId: z.string().min(1),
});

const DESCRIPTION = `Read a reusable design component, including its template,
preview HTML, and prop definitions.`;

export const readDraftComponentTool: ToolDefinition<
  z.infer<typeof readDraftComponentSchema>
> = {
  name: "read_draft_component",
  description: DESCRIPTION,
  inputSchema: readDraftComponentSchema,
  defaultConsent: "always",
  modifiesState: false,

  execute: async (args, ctx) => {
    const component = await getDraftComponentFile(ctx.appId, args.componentId);
    return `Draft component JSON:\n${JSON.stringify(component, null, 2)}`;
  },
};
