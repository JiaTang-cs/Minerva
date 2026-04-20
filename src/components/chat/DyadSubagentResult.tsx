import React from "react";
import { Bot, CheckCircle2, CircleX } from "lucide-react";
import {
  DyadBadge,
  DyadCard,
  DyadCardContent,
  DyadCardHeader,
  DyadDescription,
} from "./DyadCardPrimitives";
import { VanillaMarkdownParser } from "./DyadMarkdownParser";

interface DyadSubagentResultProps {
  node?: any;
  children?: React.ReactNode;
}

export function DyadSubagentResult({
  node,
  children,
}: DyadSubagentResultProps) {
  const subagent = node?.properties?.subagent || "";
  const description = node?.properties?.description || "";
  const status = node?.properties?.status || "completed";
  const durationMs = Number(node?.properties?.durationMs || 0);
  const taskId = node?.properties?.taskId || "";
  const icon =
    status === "completed" || status === "async_launched" ? (
      <CheckCircle2 size={15} />
    ) : (
      <CircleX size={15} />
    );
  const accentColor = status === "completed" || status === "async_launched" ? "green" : "red";
  const content = typeof children === "string" ? children : String(children ?? "");
  const statusLabel =
    status === "completed" ? "finished" : status;

  return (
    <DyadCard accentColor={accentColor} showAccent>
      <DyadCardHeader icon={<Bot size={15} />} accentColor={accentColor}>
        <DyadBadge color={accentColor}>
          {status === "async_launched" ? "Background Task" : "Subagent Result"}
        </DyadBadge>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground ring-1 ring-inset ring-border">
          {subagent}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          {icon}
          {statusLabel}
        </span>
      </DyadCardHeader>
      <DyadDescription>
        {description}
        {taskId ? ` Task: ${taskId}.` : ""}
        {durationMs > 0 ? ` ${Math.round(durationMs / 100) / 10}s.` : ""}
      </DyadDescription>
      {content.trim() ? (
        <DyadCardContent isExpanded={true} className="opacity-100 grid-rows-[1fr]">
          <VanillaMarkdownParser content={content} />
        </DyadCardContent>
      ) : null}
    </DyadCard>
  );
}
