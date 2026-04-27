import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MessageSquareText,
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
  const pattern = /<qa\s+([^>]*)>([\s\S]*?)<\/qa>/g;
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

export function DyadAskUserQuestion({
  children,
  node,
}: DyadAskUserQuestionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const current = entries[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < entries.length - 1;

  return (
    <div className="my-4 border rounded-lg overflow-hidden border-primary/20 bg-primary/5">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-primary" size={20} />
          <span className="font-semibold text-foreground">
            Questionnaire Responses
          </span>
          <span className="flex items-center text-xs text-primary px-2 py-0.5 bg-primary/10 rounded-md font-medium">
            {count} answered
          </span>
        </div>
        <CheckCircle2 className="size-4 text-green-600 dark:text-green-500 shrink-0" />
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-lg bg-(--background-lightest) dark:bg-zinc-900/60 border border-border/40 overflow-hidden">
          <div className="px-3.5 pt-3 pb-2.5 bg-muted/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <MessageSquareText size={12} />
                Guided question
              </span>
              {current.header && (
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                  {current.header}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {current.question}
            </p>
          </div>

          <div className="h-px bg-border" />

          <div className="px-3.5 pt-2.5 pb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Answer
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {current.answer}
            </p>
          </div>
        </div>

        {entries.length > 1 && (
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              {entries.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === currentIndex
                      ? "w-5 h-1.5 bg-primary"
                      : "w-1.5 h-1.5 bg-primary/25 hover:bg-primary/40"
                  }`}
                  aria-label={`Go to question ${i + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentIndex((i) => i - 1)}
                disabled={!hasPrev}
                className="p-1 rounded-md hover:bg-primary/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous question"
              >
                <ChevronLeft size={16} className="text-muted-foreground" />
              </button>
              <span className="text-xs text-muted-foreground tabular-nums min-w-[3ch] text-center">
                {currentIndex + 1}/{entries.length}
              </span>
              <button
                onClick={() => setCurrentIndex((i) => i + 1)}
                disabled={!hasNext}
                className="p-1 rounded-md hover:bg-primary/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                aria-label="Next question"
              >
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
