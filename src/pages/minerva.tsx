import { useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircuitBoard,
  ClipboardCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { ipc } from "@/ipc/types";
import type {
  MinervaCapability,
  MinervaDesignQualityReport,
  MinervaDupoEvaluationResult,
  MinervaEngineeringLoopState,
  MinervaSecurityGateResult,
} from "@/ipc/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SAMPLE_DESIGN = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; color: var(--foreground); background: var(--background); }
    main { display: grid; gap: 24px; max-width: 1080px; margin: auto; padding: 32px; }
    @media (max-width: 720px) { main { padding: 18px; } }
  </style>
</head>
<body>
  <main>
    <section aria-label="Minerva dashboard">
      <h1>Minerva delivery cockpit</h1>
      <p>Plan, design, build, review, and prepare deployable software from one engineering loop.</p>
      <img src="/preview.png" alt="Application preview" />
    </section>
  </main>
</body>
</html>`;

const statusLabels: Record<MinervaCapability["status"], string> = {
  "inherited-foundation": "Foundation",
  "minerva-added": "Added",
  "minerva-supported": "Supported",
  planned: "Planned",
};

const LOOP_STAGES: MinervaEngineeringLoopState["currentStage"][] = [
  "plan",
  "design",
  "build",
  "typecheck",
  "security-review",
  "deploy-ready",
];

function StatusBadge({ status }: { status: MinervaCapability["status"] }) {
  const variant = status === "planned" ? "outline" : "secondary";
  return <Badge variant={variant}>{statusLabels[status]}</Badge>;
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-3">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function MinervaPage() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [capabilities, setCapabilities] = useState<MinervaCapability[]>([]);
  const [loopState, setLoopState] = useState<MinervaEngineeringLoopState | null>(
    null,
  );
  const [dupo, setDupo] = useState<MinervaDupoEvaluationResult | null>(null);
  const [securityGate, setSecurityGate] =
    useState<MinervaSecurityGateResult | null>(null);
  const [designHtml, setDesignHtml] = useState(SAMPLE_DESIGN);
  const [designQuality, setDesignQuality] =
    useState<MinervaDesignQualityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appInput = useMemo(
    () => ({ appId: selectedAppId ?? null }),
    [selectedAppId],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [
          nextCapabilities,
          nextLoopState,
          nextDupo,
          nextSecurityGate,
          nextDesignQuality,
        ] = await Promise.all([
          ipc.minerva.getInnovationAudit(undefined),
          ipc.minerva.getLoopState(appInput),
          ipc.minerva.evaluateDupoTrajectories({}),
          ipc.minerva.getSecurityGate(appInput),
          ipc.minerva.evaluateDesignQuality({ html: designHtml }),
        ]);

        if (!cancelled) {
          setCapabilities(nextCapabilities);
          setLoopState(nextLoopState);
          setDupo(nextDupo);
          setSecurityGate(nextSecurityGate);
          setDesignQuality(nextDesignQuality);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [appInput, designHtml]);

  const refreshDesignQuality = async () => {
    setDesignQuality(
      await ipc.minerva.evaluateDesignQuality({ html: designHtml }),
    );
  };

  return (
    <div className="h-full w-full overflow-auto">
      <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CircuitBoard className="h-4 w-4" />
            Minerva engineering cockpit
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Innovation workflow support
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Inspect capability status, DUPO trajectory signals, design
                quality, security gates, and delivery-loop readiness in one
                place.
              </p>
            </div>
            <Badge variant={loopState?.blocked ? "destructive" : "secondary"}>
              {loopState?.blocked ? "Blocked" : "Ready to inspect"}
            </Badge>
          </div>
        </section>

        {error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" />
                Minerva data unavailable
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Loop stage"
            value={loopState?.currentStage ?? "loading"}
            description={loopState?.nextAction ?? "Reading workflow state."}
          />
          <MetricCard
            title="DUPO groups"
            value={String(dupo?.usefulGradientGroups ?? 0)}
            description={
              dupo?.summary ?? "Evaluating mixed-outcome trajectory signals."
            }
          />
          <MetricCard
            title="Design score"
            value={
              designQuality ? `${designQuality.score}/100` : "loading"
            }
            description="Static quality checks for design drafts."
          />
          <MetricCard
            title="Security gate"
            value={securityGate?.passed ? "Passed" : "Blocked"}
            description={
              securityGate?.recommendation ?? "Reading latest security review."
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5" />
                Capability matrix
              </CardTitle>
              <CardDescription>
                Product-facing innovation status used by Minerva.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {capabilities.map((capability) => (
                <div
                  key={capability.id}
                  className="rounded-md border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-medium">{capability.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {capability.summary}
                      </p>
                    </div>
                    <StatusBadge status={capability.status} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {capability.implementation}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="h-5 w-5" />
                Delivery loop
              </CardTitle>
              <CardDescription>
                Current app: {selectedAppId ? `#${selectedAppId}` : "none selected"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {LOOP_STAGES.map((stage) => {
                const complete = loopState?.completedStages.includes(stage);
                return (
                  <div
                    key={stage}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="text-sm font-medium">{stage}</span>
                    {complete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        pending
                      </span>
                    )}
                  </div>
                );
              })}
              {loopState?.blocker ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  {loopState.blocker}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ClipboardCheck className="h-5 w-5" />
                Design quality evaluator
              </CardTitle>
              <CardDescription>
                Paste a design draft HTML document to score its delivery
                readiness.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={designHtml}
                onChange={(event) => setDesignHtml(event.target.value)}
                className="min-h-56 font-mono text-xs"
              />
              <Button onClick={refreshDesignQuality}>Evaluate design</Button>
              <div className="space-y-2">
                {designQuality?.checks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{check.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {check.message}
                      </p>
                    </div>
                    <Badge variant={check.passed ? "secondary" : "outline"}>
                      {check.passed ? "pass" : "review"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="h-5 w-5" />
                Security and DUPO signals
              </CardTitle>
              <CardDescription>
                High-severity findings block deploy-ready status; mixed
                trajectory outcomes become prioritized learning signals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-4">
                <p className="text-sm font-medium">Security gate</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {securityGate?.recommendation}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Findings: {securityGate?.findingsCount ?? 0}
                </p>
              </div>
              <div className="space-y-2">
                {dupo?.groups.map((group) => (
                  <div key={group.taskGroupId} className="rounded-md border p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{group.taskGroupId}</p>
                      <Badge variant="outline">{group.classification}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      reward variance {group.rewardVariance}, sample weight{" "}
                      {group.sampleWeight}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
