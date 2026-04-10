import crypto from "node:crypto";
import log from "electron-log";
import { z } from "zod";
import { safeSend } from "@/ipc/utils/safe_sender";
import { waitForAskUserQuestionResponse } from "../tool_definitions";
import type { ToolDefinition, AgentContext } from "./types";
import {
  escapeXmlAttr,
  escapeXmlContent,
} from "../../../../../../../shared/xmlEscape";

const logger = log.scope("ask_user_question");

const QuestionOptionSchema = z.object({
  label: z
    .string()
    .min(1)
    .max(80)
    .describe("Short option label shown to the user"),
  description: z
    .string()
    .min(1)
    .max(240)
    .optional()
    .describe("Short description to help the user compare options"),
});

const QuestionSchema = z.object({
  question: z
    .string()
    .min(1)
    .describe("The full question text presented to the user"),
  header: z
    .string()
    .min(1)
    .max(12)
    .describe("Short tab/chip label used in the question UI"),
  options: z
    .array(QuestionOptionSchema)
    .min(2)
    .max(4)
    .describe("2-4 meaningful options. Do not include an Other option."),
  multiSelect: z
    .boolean()
    .default(false)
    .describe("Whether multiple options can be selected"),
  placeholder: z
    .string()
    .optional()
    .describe("Optional placeholder for custom free-form input"),
});

const askUserQuestionSchema = z.object({
  questions: z.array(QuestionSchema).min(1).max(4),
});

const DESCRIPTION = `Asks the user multiple choice questions to gather information, clarify ambiguity, understand preferences, make decisions or offer them choices.

Use this tool when:
- you need to clarify ambiguous instructions
- you need product, platform, or design preference input
- you need a concrete decision before continuing

Guidelines:
- Ask at most 4 questions
- Ask only high-leverage questions
- Do NOT add an "Other" option; the UI provides custom input automatically
- Prefer the recommended option first when you have a strong default
- Do not ask for trivial confirmations or permission to continue
`;

export const askUserQuestionTool: ToolDefinition<
  z.infer<typeof askUserQuestionSchema>
> = {
  name: "ask_user_question",
  description: DESCRIPTION,
  inputSchema: askUserQuestionSchema,
  defaultConsent: "always",
  modifiesState: true,

  getConsentPreview: (args) =>
    `Ask user question (${args.questions.length} prompts)`,

  execute: async (args, ctx: AgentContext) => {
    const requestId = `design-ask-user-question:${crypto.randomUUID()}`;
    const questions = args.questions.map((question) => ({
      ...question,
      id: `design_question_${crypto.randomUUID().slice(0, 8)}`,
    }));

    logger.log(
      `Presenting ask user question UI (${questions.length} questions), requestId: ${requestId}`,
    );

    safeSend(ctx.event.sender, "design:ask-user-question", {
      chatId: ctx.chatId,
      requestId,
      questions,
    });

    const answers = await waitForAskUserQuestionResponse(requestId, ctx.chatId);
    if (!answers) {
      return "The user dismissed ask user question without answering.";
    }

    const qaEntries = questions
      .map((question) => {
        const answer = answers[question.id] || "(no answer)";
        return `<qa header="${escapeXmlAttr(question.header)}" question="${escapeXmlAttr(question.question)}">${escapeXmlContent(answer)}</qa>`;
      })
      .join("\n");

    ctx.onXmlComplete(
      `<dyad-ask-user-question count="${questions.length}">\n${qaEntries}\n</dyad-ask-user-question>`,
    );

    return questions
      .map((question) => {
        const answer = answers[question.id] || "(no answer)";
        return `**${question.question}**\n${answer}`;
      })
      .join("\n\n");
  },
};
