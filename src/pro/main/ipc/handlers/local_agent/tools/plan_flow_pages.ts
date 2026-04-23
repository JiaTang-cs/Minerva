import crypto from "node:crypto";
import { z } from "zod";
import { safeSend } from "@/ipc/utils/safe_sender";
import {
  getDesignDraftFile,
  getDesignDraftForChatFile,
  updateDesignFlowStatusFile,
} from "@/ipc/handlers/design_handlers";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { waitForAskUserQuestionResponse } from "../tool_definitions";
import type { ToolDefinition } from "./types";
import { escapeXmlAttr, escapeXmlContent } from "./types";

const suggestedPageSchema = z.object({
  title: z.string().min(1).max(80),
  prompt: z.string().min(1).max(500).optional(),
});

const planFlowPagesSchema = z.object({
  sourceDraftId: z.string().optional(),
  flowTitle: z.string().min(1).max(120).optional(),
  suggestedPages: z.array(suggestedPageSchema).min(1).max(4),
});

const DESCRIPTION = `Plan additional design pages for the current multi-page flow.

Use this after a root design page already exists and the user wants related pages.
The tool will ask the user which proposed pages to generate and also allows custom
page names via the built-in custom input field.
`;

function parsePageTitles(answer: string): string[] {
  return answer
    .split(/[,\n，、]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export const planFlowPagesTool: ToolDefinition<
  z.infer<typeof planFlowPagesSchema>
> = {
  name: "plan_flow_pages",
  description: DESCRIPTION,
  inputSchema: planFlowPagesSchema,
  defaultConsent: "always",
  modifiesState: true,

  getConsentPreview: (args) =>
    `Plan ${args.suggestedPages.length} flow page suggestions`,

  execute: async (args, ctx) => {
    const sourceDraft = args.sourceDraftId
      ? await getDesignDraftFile(ctx.appId, args.sourceDraftId)
      : await getDesignDraftForChatFile(ctx.appId, ctx.chatId);

    if (!sourceDraft) {
      throw new DyadError(
        "No design draft exists yet for this chat. Create the first design page before planning more pages.",
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
      status: "planning",
      title: args.flowTitle,
    });

    const requestId = `design-plan-flow-pages:${crypto.randomUUID()}`;
    const questionId = `design_flow_pages_${crypto.randomUUID().slice(0, 8)}`;
    safeSend(ctx.event.sender, "design:ask-user-question", {
      chatId: ctx.chatId,
      requestId,
      questions: [
        {
          id: questionId,
          header: "Pages",
          question: `Select or add the pages to generate for "${args.flowTitle ?? sourceDraft.title}".`,
          multiSelect: true,
          options: args.suggestedPages.map((page) => ({
            label: page.title,
            description:
              page.prompt ??
              `Generate a ${page.title} page that extends the current design flow.`,
          })),
          placeholder: "Add custom page names, separated by commas",
        },
      ],
    });

    const answers = await waitForAskUserQuestionResponse(requestId, ctx.chatId);
    if (!answers) {
      await updateDesignFlowStatusFile({
        appId: ctx.appId,
        flowId: sourceDraft.flowId,
        status: "ready",
      });
      return "The user dismissed flow page planning without approving pages.";
    }

    const selectedTitles = parsePageTitles(answers[questionId] ?? "");
    const knownPages = new Map(
      args.suggestedPages.map((page) => [page.title.toLowerCase(), page]),
    );

    const approvedPages = selectedTitles.map((title) => {
      const knownPage = knownPages.get(title.toLowerCase());
      return {
        title,
        prompt:
          knownPage?.prompt ??
          `Design a ${title} page that matches the existing design flow and reuses shared components from "${sourceDraft.title}".`,
      };
    });

    if (approvedPages.length === 0) {
      await updateDesignFlowStatusFile({
        appId: ctx.appId,
        flowId: sourceDraft.flowId,
        status: "ready",
      });
      throw new DyadError(
        "No flow pages were approved. Ask the user to choose at least one page before generating.",
        DyadErrorKind.UserCancelled,
      );
    }

    await updateDesignFlowStatusFile({
      appId: ctx.appId,
      flowId: sourceDraft.flowId,
      status: "ready",
    });

    const pageXml = approvedPages
      .map(
        (page) =>
          `<page title="${escapeXmlAttr(page.title)}">${escapeXmlContent(page.prompt)}</page>`,
      )
      .join("\n");

    ctx.onXmlComplete(
      `<dyad-design-flow-pages action="planned" source-draft-id="${sourceDraft.id}" count="${approvedPages.length}">\n${pageXml}\n</dyad-design-flow-pages>`,
    );

    return `Approved flow pages JSON:\n${JSON.stringify(approvedPages, null, 2)}`;
  },
};
