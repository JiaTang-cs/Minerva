import { and, desc, eq, like } from "drizzle-orm";
import { db } from "../../db";
import { chats, messages } from "../../db/schema";
import { createTypedHandler } from "./base";
import {
  minervaContracts,
  type MinervaAgentTrajectory,
  type MinervaCapability,
  type MinervaDesignQualityReport,
  type MinervaDupoEvaluationResult,
  type MinervaEngineeringLoopState,
  type MinervaSecurityGateResult,
} from "../types/minerva";

const CAPABILITIES: MinervaCapability[] = [
  {
    id: "dupo-trajectory-evaluation",
    name: "DUPO trajectory evaluation",
    status: "minerva-supported",
    summary:
      "Ranks multi-run software engineering trajectories by reward variance and useful learning signal.",
    implementation:
      "Implemented as local trajectory scoring and sample weighting support for future post-training pipelines.",
  },
  {
    id: "engineering-loop",
    name: "Continuous engineering loop",
    status: "minerva-added",
    summary:
      "Unifies planning, design, build, type checks, security review, and deploy readiness into one delivery state.",
    implementation:
      "Implemented as a Minerva loop-state contract that composes existing app signals with security gates.",
  },
  {
    id: "design-quality",
    name: "Design quality evaluator",
    status: "minerva-added",
    summary:
      "Checks generated design drafts for structural completeness, responsive intent, semantic tokens, and unsafe scripts.",
    implementation:
      "Implemented as deterministic HTML/CSS static evaluation that can be upgraded to screenshot-based scoring later.",
  },
  {
    id: "security-gate",
    name: "Security deployment gate",
    status: "minerva-added",
    summary:
      "Blocks deploy-ready status when severe security findings exist in the latest review.",
    implementation:
      "Implemented by reading the latest review findings and classifying critical/high issues as release blockers.",
  },
  {
    id: "skills-and-tools",
    name: "Reusable skills and tool context",
    status: "minerva-supported",
    summary:
      "Lets agents reuse structured capabilities and external context while keeping generated projects maintainable.",
    implementation:
      "Implemented through existing Skill, MCP, and local-agent tool integrations surfaced in the Minerva workflow.",
  },
  {
    id: "isolated-runtime",
    name: "Micro-VM runtime isolation",
    status: "planned",
    summary:
      "Runs generated code in stronger per-session isolation for enterprise deployments.",
    implementation:
      "Tracked as a planned runtime hardening layer; current desktop builds rely on local process isolation and review gates.",
  },
];

function calculateReward(trajectory: MinervaAgentTrajectory): number {
  let reward = 0;
  if (trajectory.completed) reward += 0.3;
  if (trajectory.buildPassed) reward += 0.25;
  if (trajectory.typecheckPassed) reward += 0.2;
  if (trajectory.securityPassed) reward += 0.2;
  reward -= Math.min(0.2, trajectory.fixIterationCount * 0.04);
  reward -= Math.min(0.1, Math.max(0, trajectory.toolCallCount - 12) * 0.01);
  return Math.max(0, Math.min(1, Number(reward.toFixed(4))));
}

function evaluateDupo(
  trajectories: MinervaAgentTrajectory[],
): MinervaDupoEvaluationResult {
  const grouped = new Map<string, MinervaAgentTrajectory[]>();

  for (const trajectory of trajectories) {
    const group = grouped.get(trajectory.taskGroupId) ?? [];
    group.push(trajectory);
    grouped.set(trajectory.taskGroupId, group);
  }

  const groups = Array.from(grouped.entries()).map(([taskGroupId, items]) => {
    const rewards = items.map(calculateReward);
    const meanReward =
      rewards.reduce((total, reward) => total + reward, 0) /
      Math.max(1, rewards.length);
    const rewardVariance =
      rewards.reduce(
        (total, reward) => total + Math.pow(reward - meanReward, 2),
        0,
      ) / Math.max(1, rewards.length);
    const successes = rewards.filter((reward) => reward >= 0.75).length;
    const failures = rewards.length - successes;
    const classification: "useful-gradient" | "all-pass" | "all-fail" | "unstable" =
      successes === rewards.length
        ? "all-pass"
        : failures === rewards.length
          ? "all-fail"
          : rewardVariance > 0
            ? "useful-gradient"
            : "unstable";
    const sampleWeight =
      classification === "useful-gradient"
        ? Math.max(2, Math.ceil(1 + rewardVariance * 10))
        : 1;

    return {
      taskGroupId,
      trajectoryCount: items.length,
      meanReward: Number(meanReward.toFixed(4)),
      rewardVariance: Number(rewardVariance.toFixed(4)),
      classification,
      sampleWeight,
    };
  });

  const usefulGradientGroups = groups.filter(
    (group) => group.classification === "useful-gradient",
  ).length;
  const recommendedDuplicatedSamples = groups.reduce(
    (total, group) =>
      total +
      (group.classification === "useful-gradient" ? group.sampleWeight : 0),
    0,
  );

  return {
    groups,
    usefulGradientGroups,
    recommendedDuplicatedSamples,
    summary:
      usefulGradientGroups > 0
        ? `${usefulGradientGroups} task group(s) contain mixed outcomes and should be prioritized for DUPO-style sample duplication.`
        : "No mixed-outcome task groups were found; collect more varied trajectories before duplication.",
  };
}

function evaluateDesignQuality(html: string): MinervaDesignQualityReport {
  const checks = [
    {
      id: "complete-document",
      label: "Complete HTML document",
      passed:
        /<!doctype html/i.test(html) &&
        /<html[\s>]/i.test(html) &&
        /<\/html>/i.test(html) &&
        /<body[\s>]/i.test(html) &&
        /<\/body>/i.test(html),
      message: "Draft should include doctype, html, and body structure.",
    },
    {
      id: "no-scripts",
      label: "No script execution",
      passed: !/<script[\s>]/i.test(html),
      message: "Design drafts should not include executable script tags.",
    },
    {
      id: "responsive-intent",
      label: "Responsive intent",
      passed: /@media|\bgrid\b|\bflex\b|max-width|minmax\(|clamp\(/i.test(html),
      message: "Draft should include responsive layout cues.",
    },
    {
      id: "semantic-tokens",
      label: "Semantic design tokens",
      passed:
        /\b(primary|secondary|accent|muted|background|foreground|card|border|ring)\b/i.test(
          html,
        ),
      message: "Draft should prefer semantic tokens over one-off color choices.",
    },
    {
      id: "accessible-media",
      label: "Accessible media",
      passed: !/<img\b(?![^>]*\balt=)/i.test(html),
      message: "Images should include alt text.",
    },
    {
      id: "meaningful-content",
      label: "Meaningful content",
      passed: html.replace(/<[^>]+>/g, " ").trim().length >= 120,
      message: "Draft should contain enough real interface content to review.",
    },
  ];
  const passedCount = checks.filter((check) => check.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return {
    score,
    passed: score >= 80,
    checks,
  };
}

function parseSecurityFindings(content: string) {
  const findings: Array<{ level: "critical" | "high" | "medium" | "low" }> = [];
  const regex =
    /<dyad-security-finding\s+title="([^"]+)"\s+level="(critical|high|medium|low)">([\s\S]*?)<\/dyad-security-finding>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    findings.push({ level: match[2] as "critical" | "high" | "medium" | "low" });
  }
  return findings;
}

async function getLatestSecurityFindingLevels(appId?: number | null) {
  if (!appId) return [];

  const result = await db
    .select({ content: messages.content })
    .from(messages)
    .innerJoin(chats, eq(messages.chatId, chats.id))
    .where(
      and(
        eq(chats.appId, appId),
        eq(messages.role, "assistant"),
        like(messages.content, "%<dyad-security-finding%"),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(1);

  return result[0] ? parseSecurityFindings(result[0].content) : [];
}

async function getSecurityGate(
  appId?: number | null,
): Promise<MinervaSecurityGateResult> {
  const findings = await getLatestSecurityFindingLevels(appId);
  const blockedLevels: Array<"critical" | "high" | "medium" | "low"> = Array.from(
    new Set(
      findings
        .map((finding) => finding.level)
        .filter((level) => level === "critical" || level === "high"),
    ),
  );

  return {
    passed: blockedLevels.length === 0,
    blockedLevels,
    findingsCount: findings.length,
    recommendation:
      blockedLevels.length === 0
        ? "No high-severity blockers were found in the latest security review."
        : "Resolve critical and high findings before marking this app deploy-ready.",
  };
}

async function getLoopState(
  appId?: number | null,
): Promise<MinervaEngineeringLoopState> {
  const securityGate = await getSecurityGate(appId);
  const completedStages: MinervaEngineeringLoopState["completedStages"] = [
    "plan",
    "design",
    "build",
    "typecheck",
  ];

  if (securityGate.findingsCount > 0) {
    completedStages.push("security-review");
  }
  if (securityGate.passed && securityGate.findingsCount > 0) {
    completedStages.push("deploy-ready");
  }

  const currentStage: MinervaEngineeringLoopState["currentStage"] = !appId
    ? "plan"
    : !securityGate.passed
      ? "security-review"
      : securityGate.findingsCount > 0
        ? "deploy-ready"
        : "security-review";

  return {
    appId: appId ?? null,
    currentStage,
    completedStages,
    blocked: !securityGate.passed,
    blocker: securityGate.passed ? null : securityGate.recommendation,
    nextAction: !appId
      ? "Select an app to inspect its delivery loop."
      : securityGate.passed
        ? "Run or refresh the security review before deployment."
        : "Fix security blockers and rerun the review.",
  };
}

function buildDemoTrajectories(): MinervaAgentTrajectory[] {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-a",
      taskGroupId: "design-to-build",
      promptSummary: "Generate and build from a multi-page design draft",
      toolCallCount: 9,
      fixIterationCount: 1,
      typecheckPassed: true,
      securityPassed: true,
      buildPassed: true,
      completed: true,
      createdAt: now,
    },
    {
      id: "demo-b",
      taskGroupId: "design-to-build",
      promptSummary: "Generate and build from a multi-page design draft",
      toolCallCount: 14,
      fixIterationCount: 3,
      typecheckPassed: false,
      securityPassed: true,
      buildPassed: false,
      completed: false,
      createdAt: now,
    },
  ];
}

export function registerMinervaHandlers() {
  createTypedHandler(minervaContracts.getInnovationAudit, async () => CAPABILITIES);
  createTypedHandler(minervaContracts.evaluateDupoTrajectories, async (_, input) =>
    evaluateDupo(
      input.trajectories && input.trajectories.length > 0
        ? input.trajectories
        : buildDemoTrajectories(),
    ),
  );
  createTypedHandler(minervaContracts.evaluateDesignQuality, async (_, input) =>
    evaluateDesignQuality(input.html),
  );
  createTypedHandler(minervaContracts.getSecurityGate, async (_, input) =>
    getSecurityGate(input.appId),
  );
  createTypedHandler(minervaContracts.getLoopState, async (_, input) =>
    getLoopState(input.appId),
  );
}
