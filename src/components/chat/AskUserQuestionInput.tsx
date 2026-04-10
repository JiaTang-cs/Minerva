import React, { useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  askUserQuestionSubmittedChatIdsAtom,
  pendingAskUserQuestionAtom,
} from "@/atoms/designAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { designClient } from "@/ipc/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Circle,
  MessageSquareMore,
  Send,
  X,
} from "lucide-react";

export function AskUserQuestionInput() {
  const [askUserQuestionMap, setAskUserQuestionMap] = useAtom(
    pendingAskUserQuestionAtom,
  );
  const setSubmittedChatIds = useSetAtom(askUserQuestionSubmittedChatIdsAtom);
  const chatId = useAtomValue(selectedChatIdAtom);
  const askUserQuestion =
    chatId != null ? askUserQuestionMap.get(chatId) : undefined;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | string[]>>(
    {},
  );
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setCurrentIndex(0);
    setResponses({});
    setOtherTexts({});
    setIsExpanded(true);
  }, [
    askUserQuestion?.chatId,
    askUserQuestion?.requestId,
    askUserQuestion?.questions?.length,
  ]);

  const clearAskUserQuestion = () => {
    if (chatId == null) return;
    setAskUserQuestionMap((prev) => {
      const next = new Map(prev);
      next.delete(chatId);
      return next;
    });
  };

  const handleDismiss = () => {
    if (!askUserQuestion) return;
    designClient.respondToAskUserQuestion({
      requestId: askUserQuestion.requestId,
      answers: null,
    });
    clearAskUserQuestion();
  };

  useEffect(() => {
    if (!askUserQuestion) return;
    const timeout = setTimeout(() => {
      designClient.respondToAskUserQuestion({
        requestId: askUserQuestion.requestId,
        answers: null,
      });
      clearAskUserQuestion();
    }, 5 * 60 * 1000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askUserQuestion?.requestId, chatId]);

  if (!askUserQuestion) return null;

  const currentQuestion = askUserQuestion.questions[currentIndex];
  if (!currentQuestion) return null;

  const isLastQuestion = currentIndex === askUserQuestion.questions.length - 1;
  const CUSTOM_OPTION = "__other__";

  const getFinalResponse = (questionId: string): string => {
    const response = responses[questionId];
    const otherText = otherTexts[questionId]?.trim();

    if (response === CUSTOM_OPTION) {
      return otherText || "(no answer)";
    }

    if (Array.isArray(response)) {
      const values = [...response];
      if (otherText) {
        values.push(otherText);
      }
      return values.join(", ") || "(no answer)";
    }

    if (typeof response === "string" && response.trim().length > 0) {
      return response;
    }

    return otherText || "(no answer)";
  };

  const hasValidAnswer = (): boolean => {
    const response = responses[currentQuestion.id];
    const otherText = otherTexts[currentQuestion.id]?.trim();

    if (response === CUSTOM_OPTION) {
      return Boolean(otherText);
    }

    if (Array.isArray(response)) {
      return response.length > 0 || Boolean(otherText);
    }

    return Boolean(response) || Boolean(otherText);
  };

  const handleSubmit = () => {
    if (!askUserQuestion || chatId == null) return;

    const answers: Record<string, string> = {};
    for (const question of askUserQuestion.questions) {
      answers[question.id] = getFinalResponse(question.id);
    }

    designClient.respondToAskUserQuestion({
      requestId: askUserQuestion.requestId,
      answers,
    });
    clearAskUserQuestion();

    setSubmittedChatIds((prev) => new Map([...prev, [chatId, "visible"]]));
    setTimeout(() => {
      setSubmittedChatIds((prev) => new Map([...prev, [chatId, "fading"]]));
      setTimeout(() => {
        setSubmittedChatIds((prev) => {
          const next = new Map(prev);
          next.delete(chatId);
          return next;
        });
      }, 300);
    }, 1700);
  };

  const handleNext = () => {
    if (!hasValidAnswer()) return;
    if (isLastQuestion) {
      handleSubmit();
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasValidAnswer()) {
        handleNext();
      }
    }
  };

  return (
    <div className="border-b border-border bg-amber-50/60 dark:bg-amber-500/8">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center justify-between px-3 py-2 hover:bg-amber-100/60 dark:hover:bg-amber-500/12 transition-colors"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {isExpanded ? (
              <>
                <MessageSquareMore className="w-4 h-4 text-amber-700 dark:text-amber-300 flex-shrink-0" />
                <span className="text-sm font-medium">Ask user question</span>
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 text-amber-500 flex-shrink-0 fill-current" />
                <span className="text-sm truncate">{currentQuestion.question}</span>
                <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                  ({currentIndex + 1}/{askUserQuestion.questions.length})
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {currentQuestion.header}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>
        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground flex-shrink-0 mr-1.5"
          aria-label="Dismiss ask user question"
        >
          <X size={14} />
        </Button>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 items-center rounded-full bg-amber-100 px-2.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                  {currentQuestion.header}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {currentIndex + 1} / {askUserQuestion.questions.length}
                </span>
              </div>
              <Label className="text-sm font-medium text-foreground">
                {currentQuestion.question}
              </Label>

              {currentQuestion.multiSelect ? (
                <div className="space-y-2">
                  {currentQuestion.options.map((option) => {
                    const selected =
                      ((responses[currentQuestion.id] as string[] | undefined) ??
                        []
                      ).includes(option.label);

                    return (
                      <label
                        key={option.label}
                        htmlFor={`${currentQuestion.id}-${option.label}`}
                        className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/90 px-3 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          id={`${currentQuestion.id}-${option.label}`}
                          checked={selected}
                          onCheckedChange={(checked) => {
                            setResponses((prev) => {
                              const current =
                                (prev[currentQuestion.id] as string[] | undefined) ??
                                [];
                              return {
                                ...prev,
                                [currentQuestion.id]: checked
                                  ? [...current, option.label]
                                  : current.filter((item) => item !== option.label),
                              };
                            });
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{option.label}</div>
                          {option.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}

                  <Input
                    placeholder={currentQuestion.placeholder || "Other..."}
                    value={otherTexts[currentQuestion.id] || ""}
                    onChange={(e) =>
                      setOtherTexts((prev) => ({
                        ...prev,
                        [currentQuestion.id]: e.target.value,
                      }))
                    }
                    onKeyDown={handleKeyDown}
                  />
                </div>
              ) : (
                <RadioGroup
                  value={(responses[currentQuestion.id] as string) || ""}
                  onValueChange={(value) => {
                    setResponses((prev) => ({
                      ...prev,
                      [currentQuestion.id]: value,
                    }));

                    if (value !== CUSTOM_OPTION) {
                      setOtherTexts((prev) => ({
                        ...prev,
                        [currentQuestion.id]: "",
                      }));
                    }
                  }}
                  className="space-y-2"
                >
                  {currentQuestion.options.map((option) => (
                    <label
                      key={option.label}
                      htmlFor={`${currentQuestion.id}-${option.label}`}
                      className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/90 px-3 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <RadioGroupItem
                        value={option.label}
                        id={`${currentQuestion.id}-${option.label}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}

                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/90 px-3 py-3">
                    <RadioGroupItem
                      value={CUSTOM_OPTION}
                      id={`${currentQuestion.id}-other`}
                    />
                    <Input
                      placeholder={currentQuestion.placeholder || "Other..."}
                      value={otherTexts[currentQuestion.id] || ""}
                      onFocus={() =>
                        setResponses((prev) => ({
                          ...prev,
                          [currentQuestion.id]: CUSTOM_OPTION,
                        }))
                      }
                      onChange={(e) => {
                        setOtherTexts((prev) => ({
                          ...prev,
                          [currentQuestion.id]: e.target.value,
                        }));
                        setResponses((prev) => ({
                          ...prev,
                          [currentQuestion.id]: CUSTOM_OPTION,
                        }));
                      }}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                </RadioGroup>
              )}
            </div>

            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                disabled={currentIndex === 0}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft size={14} className="mr-1.5" />
                Back
              </Button>
              <Button onClick={handleNext} disabled={!hasValidAnswer()} size="sm">
                {isLastQuestion ? (
                  <>
                    <Send size={14} className="mr-1.5" />
                    Submit
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight size={14} className="ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
