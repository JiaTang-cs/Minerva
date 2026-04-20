import React from "react";
import { Bot, Loader2 } from "lucide-react";
import {
  DyadBadge,
  DyadCard,
  DyadCardHeader,
  DyadDescription,
} from "./DyadCardPrimitives";

interface DyadSubagentToolCallProps {
  node?: any;
}

export function DyadSubagentToolCall({ node }: DyadSubagentToolCallProps) {
  const subagent = node?.properties?.subagent || "";
  const description = node?.properties?.description || "";
  const state = node?.properties?.state || "running";
  const activeTool = node?.properties?.activeTool || "";

  return (
    <DyadCard accentColor="indigo" showAccent>
      <DyadCardHeader icon={<Bot size={15} />} accentColor="indigo">
        <DyadBadge color="indigo">Subagent</DyadBadge>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground ring-1 ring-inset ring-border">
          {subagent}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 size={12} className="animate-spin" />
          {state === "background" ? "Background" : "Running"}
        </span>
      </DyadCardHeader>
      <DyadDescription>
        {description}
        {activeTool ? ` Active tool: ${activeTool}.` : ""}
      </DyadDescription>
    </DyadCard>
  );
}
