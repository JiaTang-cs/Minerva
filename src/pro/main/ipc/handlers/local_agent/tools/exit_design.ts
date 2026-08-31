import { z } from "zod";
import log from "electron-log";
import { safeSend } from "@/ipc/utils/safe_sender";
import { getDesignDraftForChatFile } from "@/ipc/handlers/design_handlers";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type { ToolDefinition, AgentContext } from "./types";

const logger = log.scope("exit_design");

const exitDesignSchema = z.object({
  confirmation: z
    .boolean()
    .describe(
      "Whether the user has explicitly decided to build from the current design. Must be true to proceed.",
    ),
});

const DESCRIPTION = `
Exit design mode after the user has explicitly decided to build from the current design draft.

IMPORTANT: Only use this tool when:
1. A design draft already exists for the current chat
2. The user has EXPLICITLY asked to build from this design
3. You are ready to hand off to the implementation agent

This will:
- Switch to Agent mode for implementation
- Open a new chat for the build phase
- Start building from the current design draft

Do NOT use this tool if:
- The user is still iterating on the design
- The user is asking for more design changes
- No design draft exists yet
`;

export const exitDesignTool: ToolDefinition<z.infer<typeof exitDesignSchema>> =
  {
    name: "exit_design",
    description: DESCRIPTION,
    inputSchema: exitDesignSchema,
    defaultConsent: "always",
    modifiesState: true,

    getConsentPreview: () => "Exit design mode and start building",

    buildXml: (args) => {
      if (!args.confirmation) return undefined;
      return `<dyad-exit-design></dyad-exit-design>`;
    },

    execute: async (args, ctx: AgentContext) => {
      if (!args.confirmation) {
        throw new DyadError(
          "User must confirm the build handoff before exiting design mode",
          DyadErrorKind.Precondition,
        );
      }

      const draft = await getDesignDraftForChatFile(ctx.appId, ctx.chatId);
      if (!draft) {
        throw new DyadError(
          "No design draft exists yet for this chat. Create or update the design draft before building.",
          DyadErrorKind.Precondition,
        );
      }

      logger.log("Exiting design mode, transitioning to build", {
        chatId: ctx.chatId,
        draftId: draft.id,
      });

      safeSend(ctx.event.sender, "design:exit", {
        chatId: ctx.chatId,
        draftId: draft.id,
      });

      return "Design approved. Switching to Agent mode to build from the current design draft.";
    },
  };
