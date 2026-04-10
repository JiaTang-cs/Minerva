import React from "react";
import { Check, FilePenLine } from "lucide-react";

interface DyadDesignDraftProps {
  node?: {
    properties?: {
      action?: string;
      draftId?: string;
      title?: string;
    };
  };
}

export function DyadDesignDraft({ node }: DyadDesignDraftProps) {
  const action = node?.properties?.action || "created";
  const title = node?.properties?.title || "Untitled design draft";
  const isUpdated = action === "updated";
  const label = isUpdated ? "Updated" : "Created";

  return (
    <div className="my-2.5 rounded-xl border border-border/80 bg-background shadow-sm">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
          <FilePenLine className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-5 text-foreground">
            <span className="mr-1.5 text-indigo-600 dark:text-indigo-300">
              {label}
            </span>
            {title}
          </p>
        </div>

        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      </div>
    </div>
  );
}
