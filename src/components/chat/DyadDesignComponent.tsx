import React from "react";
import { Blocks, Check } from "lucide-react";

interface DyadDesignComponentProps {
  node?: {
    properties?: {
      action?: string;
      name?: string;
    };
  };
}

export function DyadDesignComponent({ node }: DyadDesignComponentProps) {
  const action = node?.properties?.action === "updated" ? "Updated" : "Created";
  const name = node?.properties?.name || "Reusable component";

  return (
    <div className="my-2.5 rounded-xl border border-border/80 bg-background shadow-sm">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          <Blocks className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-5 text-foreground">
            <span className="mr-1.5 text-amber-700 dark:text-amber-300">
              {action}
            </span>
            {name}
          </p>
        </div>
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      </div>
    </div>
  );
}
