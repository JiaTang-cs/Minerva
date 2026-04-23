import React, { useEffect, useState } from "react";
import { WandSparkles } from "lucide-react";
import { CustomTagState } from "./stateTypes";
import {
  DyadBadge,
  DyadCard,
  DyadCardContent,
  DyadCardHeader,
  DyadExpandIcon,
  DyadStateIndicator,
} from "./DyadCardPrimitives";

interface DyadSkillTagProps {
  node?: {
    properties?: {
      skill?: string;
      source?: string;
      state?: CustomTagState;
      mode?: "call" | "result";
    };
  };
  children?: React.ReactNode;
}

export const DyadSkillTag: React.FC<DyadSkillTagProps> = ({ children, node }) => {
  const skill = node?.properties?.skill || "unknown-skill";
  const source = node?.properties?.source || "";
  const state = node?.properties?.state as CustomTagState;
  const mode = node?.properties?.mode || "result";
  const isPending = state === "pending";
  const [isExpanded, setIsExpanded] = useState(isPending);

  useEffect(() => {
    if (!isPending && isExpanded) {
      setIsExpanded(false);
    }
  }, [isExpanded, isPending]);

  return (
    <DyadCard
      state={state}
      accentColor="indigo"
      onClick={() => setIsExpanded(!isExpanded)}
      isExpanded={isExpanded}
      data-testid={`dyad-skill-${mode}`}
    >
      <DyadCardHeader icon={<WandSparkles size={15} />} accentColor="indigo">
        <DyadBadge color="indigo">
          {mode === "call" ? "Skill Call" : "Skill Loaded"}
        </DyadBadge>
        <span className="truncate text-sm font-medium text-foreground">{skill}</span>
        {source ? (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {source}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {isPending ? (
            <DyadStateIndicator state="pending" pendingLabel="Loading..." />
          ) : null}
          <DyadExpandIcon isExpanded={isExpanded} />
        </div>
      </DyadCardHeader>
      <DyadCardContent isExpanded={isExpanded}>
        {typeof children === "string" && children.trim() ? (
          <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm leading-6 text-muted-foreground">
            {children}
          </div>
        ) : null}
      </DyadCardContent>
    </DyadCard>
  );
};
