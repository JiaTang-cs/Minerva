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

export type AskUserQuestionPayload = z.infer<
  typeof AskUserQuestionPayloadSchema
>;

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
  flowId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DesignDraft = z.infer<typeof DesignDraftSchema>;

export const DesignFlowStatusSchema = z.enum([
  "drafting",
  "planning",
  "generating",
  "ready",
  "partial-error",
]);

export const DesignFlowSchema = z.object({
  id: z.string(),
  appId: z.number(),
  chatId: z.number(),
  title: z.string(),
  rootDraftId: z.string(),
  status: DesignFlowStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DesignFlow = z.infer<typeof DesignFlowSchema>;

export const DesignFlowPageRoleSchema = z.enum(["root", "generated"]);
export const DesignFlowPageStatusSchema = z.enum([
  "ready",
  "generating",
  "failed",
]);

export const DesignFlowPageSchema = z.object({
  id: z.string(),
  flowId: z.string(),
  draftId: z.string(),
  title: z.string(),
  prompt: z.string().nullable(),
  role: DesignFlowPageRoleSchema,
  order: z.number().int().nonnegative(),
  sourceDraftId: z.string().nullable(),
  status: DesignFlowPageStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DesignFlowPage = z.infer<typeof DesignFlowPageSchema>;

export const DraftComponentPropSchema = z.object({
  name: z.string(),
  type: z.string(),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
});

export type DraftComponentProp = z.infer<typeof DraftComponentPropSchema>;

export const DraftComponentSchema = z.object({
  id: z.string(),
  appId: z.number(),
  flowId: z.string(),
  draftId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  htmlTemplate: z.string(),
  previewHtml: z.string().nullable(),
  props: z.array(DraftComponentPropSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DraftComponent = z.infer<typeof DraftComponentSchema>;

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

export const CreateDraftComponentParamsSchema = z.object({
  appId: z.number(),
  draftId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  htmlTemplate: z.string(),
  previewHtml: z.string().optional(),
  props: z.array(DraftComponentPropSchema).default([]),
});

export type CreateDraftComponentParams = z.infer<
  typeof CreateDraftComponentParamsSchema
>;

export const UpdateDraftComponentParamsSchema = z.object({
  appId: z.number(),
  componentId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  htmlTemplate: z.string().optional(),
  previewHtml: z.string().optional(),
  props: z.array(DraftComponentPropSchema).optional(),
});

export type UpdateDraftComponentParams = z.infer<
  typeof UpdateDraftComponentParamsSchema
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

  getFlowForChat: defineContract({
    channel: "design:get-flow-for-chat",
    input: z.object({ appId: z.number(), chatId: z.number() }),
    output: DesignFlowSchema.nullable(),
  }),

  listFlowPages: defineContract({
    channel: "design:list-flow-pages",
    input: z.object({ appId: z.number(), flowId: z.string() }),
    output: z.array(DesignFlowPageSchema),
  }),

  listDraftComponents: defineContract({
    channel: "design:list-draft-components",
    input: z.object({ appId: z.number(), flowId: z.string() }),
    output: z.array(DraftComponentSchema),
  }),

  getDraftComponent: defineContract({
    channel: "design:get-draft-component",
    input: z.object({ appId: z.number(), componentId: z.string() }),
    output: DraftComponentSchema,
  }),

  createDraftComponent: defineContract({
    channel: "design:create-draft-component",
    input: CreateDraftComponentParamsSchema,
    output: DraftComponentSchema,
  }),

  updateDraftComponent: defineContract({
    channel: "design:update-draft-component",
    input: UpdateDraftComponentParamsSchema,
    output: DraftComponentSchema,
  }),

  respondToAskUserQuestion: defineContract({
    channel: "design:ask-user-question-response",
    input: AskUserQuestionResponseSchema,
    output: z.void(),
  }),
} as const;

export const designClient = createClient(designContracts);
export const designEventClient = createEventClient(designEvents);
