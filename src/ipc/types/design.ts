import { z } from "zod";
import {
  createClient,
  createEventClient,
  defineContract,
  defineEvent,
} from "../contracts/core";

export const AskUserQuestionOptionSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
});

export type AskUserQuestionOption = z.infer<typeof AskUserQuestionOptionSchema>;

export const AskUserQuestionSchema = z.object({
  id: z.string(),
  header: z.string(),
  question: z.string(),
  multiSelect: z.boolean().default(false),
  options: z.array(AskUserQuestionOptionSchema).min(2).max(4),
  placeholder: z.string().optional(),
});

export type AskUserQuestion = z.infer<typeof AskUserQuestionSchema>;

export const AskUserQuestionPayloadSchema = z.object({
  chatId: z.number(),
  requestId: z.string(),
  questions: z.array(AskUserQuestionSchema).min(1).max(4),
});

export type AskUserQuestionPayload = z.infer<typeof AskUserQuestionPayloadSchema>;

export const AskUserQuestionResponseSchema = z.object({
  requestId: z.string(),
  answers: z.record(z.string(), z.string()).nullable(),
});

export type AskUserQuestionResponse = z.infer<
  typeof AskUserQuestionResponseSchema
>;

export const DesignExitSchema = z.object({
  chatId: z.number(),
  draftId: z.string(),
});

export type DesignExitPayload = z.infer<typeof DesignExitSchema>;

export const DesignDraftSchema = z.object({
  id: z.string(),
  appId: z.number(),
  chatId: z.number(),
  title: z.string(),
  brief: z.string().nullable(),
  deviceMode: z.enum(["desktop", "tablet", "mobile"]),
  html: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DesignDraft = z.infer<typeof DesignDraftSchema>;

export const CreateDesignDraftParamsSchema = z.object({
  appId: z.number(),
  chatId: z.number(),
  title: z.string(),
  brief: z.string().optional(),
  deviceMode: z.enum(["desktop", "tablet", "mobile"]).default("desktop"),
  html: z.string(),
});

export type CreateDesignDraftParams = z.infer<
  typeof CreateDesignDraftParamsSchema
>;

export const UpdateDesignDraftParamsSchema = z.object({
  appId: z.number(),
  draftId: z.string(),
  title: z.string().optional(),
  brief: z.string().optional(),
  deviceMode: z.enum(["desktop", "tablet", "mobile"]).optional(),
  html: z.string().optional(),
});

export type UpdateDesignDraftParams = z.infer<
  typeof UpdateDesignDraftParamsSchema
>;

export const designEvents = {
  askUserQuestion: defineEvent({
    channel: "design:ask-user-question",
    payload: AskUserQuestionPayloadSchema,
  }),

  exit: defineEvent({
    channel: "design:exit",
    payload: DesignExitSchema,
  }),
} as const;

export const designContracts = {
  createDraft: defineContract({
    channel: "design:create-draft",
    input: CreateDesignDraftParamsSchema,
    output: z.string(),
  }),

  getDraft: defineContract({
    channel: "design:get-draft",
    input: z.object({ appId: z.number(), draftId: z.string() }),
    output: DesignDraftSchema,
  }),

  getDraftForChat: defineContract({
    channel: "design:get-draft-for-chat",
    input: z.object({ appId: z.number(), chatId: z.number() }),
    output: DesignDraftSchema.nullable(),
  }),

  updateDraft: defineContract({
    channel: "design:update-draft",
    input: UpdateDesignDraftParamsSchema,
    output: z.void(),
  }),

  respondToAskUserQuestion: defineContract({
    channel: "design:ask-user-question-response",
    input: AskUserQuestionResponseSchema,
    output: z.void(),
  }),
} as const;

export const designClient = createClient(designContracts);
export const designEventClient = createEventClient(designEvents);
