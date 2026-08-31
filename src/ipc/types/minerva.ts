import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";

export const MinervaCapabilityStatusSchema = z.enum([
  "inherited-foundation",
  "minerva-added",
  "minerva-supported",
  "planned",
]);

export const MinervaCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: MinervaCapabilityStatusSchema,
  summary: z.string(),
  implementation: z.string(),
});

export type MinervaCapability = z.infer<typeof MinervaCapabilitySchema>;

export const MinervaAgentTrajectorySchema = z.object({
  id: z.string(),
  taskGroupId: z.string(),
  promptSummary: z.string(),
  toolCallCount: z.number().int().nonnegative(),
  fixIterationCount: z.number().int().nonnegative(),
  typecheckPassed: z.boolean(),
  securityPassed: z.boolean(),
  buildPassed: z.boolean(),
  completed: z.boolean(),
  createdAt: z.string(),
});

export type MinervaAgentTrajectory = z.infer<
  typeof MinervaAgentTrajectorySchema
>;

export const MinervaDupoGroupResultSchema = z.object({
  taskGroupId: z.string(),
  trajectoryCount: z.number().int().nonnegative(),
  meanReward: z.number(),
  rewardVariance: z.number(),
  classification: z.enum([
    "useful-gradient",
    "all-pass",
    "all-fail",
    "unstable",
  ]),
  sampleWeight: z.number(),
});

export const MinervaDupoEvaluationResultSchema = z.object({
  groups: z.array(MinervaDupoGroupResultSchema),
  usefulGradientGroups: z.number().int().nonnegative(),
  recommendedDuplicatedSamples: z.number().int().nonnegative(),
  summary: z.string(),
});

export type MinervaDupoEvaluationResult = z.infer<
  typeof MinervaDupoEvaluationResultSchema
>;

export const MinervaLoopStageSchema = z.enum([
  "plan",
  "design",
  "build",
  "typecheck",
  "security-review",
  "deploy-ready",
]);

export const MinervaEngineeringLoopStateSchema = z.object({
  appId: z.number().nullable(),
  currentStage: MinervaLoopStageSchema,
  completedStages: z.array(MinervaLoopStageSchema),
  blocked: z.boolean(),
  blocker: z.string().nullable(),
  nextAction: z.string(),
});

export type MinervaEngineeringLoopState = z.infer<
  typeof MinervaEngineeringLoopStateSchema
>;

export const MinervaDesignQualityReportSchema = z.object({
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  checks: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      passed: z.boolean(),
      message: z.string(),
    }),
  ),
});

export type MinervaDesignQualityReport = z.infer<
  typeof MinervaDesignQualityReportSchema
>;

export const MinervaSecurityGateResultSchema = z.object({
  passed: z.boolean(),
  blockedLevels: z.array(z.enum(["critical", "high", "medium", "low"])),
  findingsCount: z.number().int().nonnegative(),
  recommendation: z.string(),
});

export type MinervaSecurityGateResult = z.infer<
  typeof MinervaSecurityGateResultSchema
>;

export const MinervaAppInputSchema = z.object({
  appId: z.number().nullable().optional(),
});

export const MinervaEvaluateDupoInputSchema = z.object({
  trajectories: z.array(MinervaAgentTrajectorySchema).optional(),
});

export const MinervaEvaluateDesignQualityInputSchema = z.object({
  html: z.string(),
});

export const minervaContracts = {
  getInnovationAudit: defineContract({
    channel: "minerva:get-innovation-audit",
    input: z.void(),
    output: z.array(MinervaCapabilitySchema),
  }),
  getLoopState: defineContract({
    channel: "minerva:get-loop-state",
    input: MinervaAppInputSchema,
    output: MinervaEngineeringLoopStateSchema,
  }),
  evaluateDupoTrajectories: defineContract({
    channel: "minerva:evaluate-dupo-trajectories",
    input: MinervaEvaluateDupoInputSchema,
    output: MinervaDupoEvaluationResultSchema,
  }),
  evaluateDesignQuality: defineContract({
    channel: "minerva:evaluate-design-quality",
    input: MinervaEvaluateDesignQualityInputSchema,
    output: MinervaDesignQualityReportSchema,
  }),
  getSecurityGate: defineContract({
    channel: "minerva:get-security-gate",
    input: MinervaAppInputSchema,
    output: MinervaSecurityGateResultSchema,
  }),
} as const;

export const minervaClient = createClient(minervaContracts);
