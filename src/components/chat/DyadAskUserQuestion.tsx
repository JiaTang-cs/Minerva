import React, { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquareMore,
} from "lucide-react";
import { unescapeXmlAttr, unescapeXmlContent } from "../../../shared/xmlEscape";

interface QAEntry {
  header?: string;
  question: string;
  answer: string;
}

interface DyadAskUserQuestionProps {
  children?: React.ReactNode;
  node?: {
    properties?: {
      count?: string;
    };
  };
}

function parseQAEntries(content: string): QAEntry[] {
  const entries: QAEntry[] = [];
  const pattern =
    /<qa\s+([^>]*)>([\s\S]*?)<\/qa>/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const attributes = match[1];
    const answer = unescapeXmlContent(match[2].trim());
    const questionMatch = attributes.match(/question="([^"]*)"/);
    const headerMatch = attributes.match(/header="([^"]*)"/);

    if (!questionMatch) {
      continue;
    }

    entries.push({
      question: unescapeXmlAttr(questionMatch[1]),
      header: headerMatch ? unescapeXmlAttr(headerMatch[1]) : undefined,
      answer,
    });
  }

  return entries;
}

function splitAnswerIntoChips(answer: string): string[] {
  return answer
    .split(/,|，/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function DyadAskUserQuestion({
  children,
  node,
}: DyadAskUserQuestionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const entries = useMemo(
    () => parseQAEntries(typeof children === "string" ? children : ""),
    [children],
  );

  const count =
    Number(node?.properties?.count) > 0
      ? Number(node?.properties?.count)
      : entries.length;

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/15"
        aria-expanded={isExpanded}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground/90">
            {count} questions answered
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <>
          <div className="h-px bg-border" />
          <div className="space-y-4 px-4 py-4">
            {entries.map((entry, index) => {
              const chips = splitAnswerIntoChips(entry.answer);
              const title = entry.header || entry.question;

              return (
                <div key={`${entry.question}-${index}`} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <MessageSquareMore className="h-3.5 w-3.5 shrink-0 text-muted-foreground/65" />
                    <p className="text-[13px] font-medium leading-5 text-muted-foreground">
                      {title}
                    </p>
                  </div>

                  {chips.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {chips.map((chip, chipIndex) => (
                        <span
                          key={`${chip}-${chipIndex}`}
                          className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1.5 text-[13px] font-medium leading-5 text-foreground"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] leading-5 text-foreground">
                      {entry.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
