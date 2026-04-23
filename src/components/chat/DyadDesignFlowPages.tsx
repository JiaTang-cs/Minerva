import React, { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, FileStack, TriangleAlert } from "lucide-react";
import { unescapeXmlAttr, unescapeXmlContent } from "../../../shared/xmlEscape";

interface PageEntry {
  title: string;
  draftId?: string;
  status: "page" | "failure";
  detail: string;
}

interface DyadDesignFlowPagesProps {
  children?: React.ReactNode;
  node?: {
    properties?: {
      action?: string;
      count?: string;
      failures?: string;
    };
  };
}

function parseEntries(content: string): PageEntry[] {
  const entries: PageEntry[] = [];

  const pagePattern = /<page\s+([^>]*)>([\s\S]*?)<\/page>/g;
  let match: RegExpExecArray | null;
  while ((match = pagePattern.exec(content)) !== null) {
    const attrs = match[1];
    const titleMatch = attrs.match(/title="([^"]*)"/);
    const draftIdMatch = attrs.match(/draft-id="([^"]*)"/);
    if (!titleMatch) continue;
    entries.push({
      title: unescapeXmlAttr(titleMatch[1]),
      draftId: draftIdMatch ? unescapeXmlAttr(draftIdMatch[1]) : undefined,
      status: "page",
      detail: unescapeXmlContent(match[2].trim()),
    });
  }

  const failurePattern = /<failure\s+([^>]*)>([\s\S]*?)<\/failure>/g;
  while ((match = failurePattern.exec(content)) !== null) {
    const attrs = match[1];
    const titleMatch = attrs.match(/title="([^"]*)"/);
    if (!titleMatch) continue;
    entries.push({
      title: unescapeXmlAttr(titleMatch[1]),
      status: "failure",
      detail: unescapeXmlContent(match[2].trim()),
    });
  }

  return entries;
}

export function DyadDesignFlowPages({
  children,
  node,
}: DyadDesignFlowPagesProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const entries = useMemo(
    () => parseEntries(typeof children === "string" ? children : ""),
    [children],
  );
  const action =
    node?.properties?.action === "generated" ? "Generated pages" : "Planned pages";
  const count =
    Number(node?.properties?.count) > 0
      ? Number(node?.properties?.count)
      : entries.filter((entry) => entry.status === "page").length;

  if (entries.length === 0) return null;

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/15"
        aria-expanded={isExpanded}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <FileStack className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground/90">
            {action}: {count}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {isExpanded ? (
        <>
          <div className="h-px bg-border" />
          <div className="space-y-2 px-4 py-4">
            {entries.map((entry, index) => (
              <div
                key={`${entry.title}-${index}`}
                className="rounded-xl border border-border/70 bg-muted/20 px-3 py-3"
              >
                <div className="flex items-center gap-2">
                  {entry.status === "failure" ? (
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  )}
                  <p className="text-[13px] font-medium leading-5 text-foreground">
                    {entry.title}
                  </p>
                </div>
                {entry.detail ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {entry.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
