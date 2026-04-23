import { z } from "zod";
import {
  createGeneratedFlowPageFile,
  getDesignDraftFile,
  getDesignDraftForChatFile,
  updateDesignFlowStatusFile,
} from "@/ipc/handlers/design_handlers";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type { ToolDefinition } from "./types";
import { escapeXmlAttr, escapeXmlContent } from "./types";

const flowPageSchema = z.object({
  title: z.string().min(1).max(120),
  prompt: z.string().max(500).optional(),
  deviceMode: z.enum(["desktop", "tablet", "mobile"]).optional(),
  html: z.string().min(1),
});

const executeFlowPagesSchema = z.object({
  sourceDraftId: z.string().optional(),
  pages: z.array(flowPageSchema).min(1).max(8),
});

const DESCRIPTION = `Generate and persist additional pages for the current design flow.

Call this only after planning the pages and extracting reusable components from
the source design.
`;

export const executeFlowPagesTool: ToolDefinition<
  z.infer<typeof executeFlowPagesSchema>
> = {
  name: "execute_flow_pages",
  description: DESCRIPTION,
  inputSchema: executeFlowPagesSchema,
  defaultConsent: "always",
  modifiesState: true,

  getConsentPreview: (args) => `Generate ${args.pages.length} flow pages`,

  execute: async (args, ctx) => {
    const sourceDraft = args.sourceDraftId
      ? await getDesignDraftFile(ctx.appId, args.sourceDraftId)
      : await getDesignDraftForChatFile(ctx.appId, ctx.chatId);

    if (!sourceDraft) {
      throw new DyadError(
        "No source design draft exists yet for this chat.",
        DyadErrorKind.Precondition,
      );
    }

    if (!sourceDraft.flowId) {
      throw new DyadError(
        "The source design draft is not attached to a flow yet.",
        DyadErrorKind.Precondition,
      );
    }

    await updateDesignFlowStatusFile({
      appId: ctx.appId,
      flowId: sourceDraft.flowId,
      status: "generating",
    });

    const createdPages: Array<{
      pageId: string;
      draftId: string;
      title: string;
    }> = [];
    const failures: Array<{ title: string; error: string }> = [];

    for (const page of args.pages) {
      try {
        const result = await createGeneratedFlowPageFile({
          appId: ctx.appId,
          sourceDraftId: sourceDraft.id,
          title: page.title,
          prompt: page.prompt,
          deviceMode: page.deviceMode ?? sourceDraft.deviceMode,
          html: page.html,
        });
        createdPages.push({
          pageId: result.page.id,
          draftId: result.draft.id,
          title: result.page.title,
        });
      } catch (error) {
        failures.push({
          title: page.title,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await updateDesignFlowStatusFile({
      appId: ctx.appId,
      flowId: sourceDraft.flowId,
      status: failures.length > 0 ? "partial-error" : "ready",
    });

    if (createdPages.length === 0) {
      throw new DyadError(
        `Failed to generate any flow pages: ${failures.map((item) => `${item.title}: ${item.error}`).join("; ")}`,
        DyadErrorKind.Internal,
      );
    }

    const pageXml = createdPages
      .map(
        (page) =>
          `<page page-id="${page.pageId}" draft-id="${page.draftId}" title="${escapeXmlAttr(page.title)}"></page>`,
      )
      .join("\n");
    const failureXml = failures
      .map(
        (failure) =>
          `<failure title="${escapeXmlAttr(failure.title)}">${escapeXmlContent(failure.error)}</failure>`,
      )
      .join("\n");

    ctx.onXmlComplete(
      `<dyad-design-flow-pages action="generated" source-draft-id="${sourceDraft.id}" count="${createdPages.length}" failures="${failures.length}">\n${pageXml}${failureXml ? `\n${failureXml}` : ""}\n</dyad-design-flow-pages>`,
    );

    return `Generated flow pages JSON:\n${JSON.stringify(
      {
        createdPages,
        failures,
      },
      null,
      2,
    )}`;
  },
};
