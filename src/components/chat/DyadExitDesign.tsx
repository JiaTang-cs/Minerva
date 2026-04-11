import React, { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { ArrowRight, CheckCircle } from "lucide-react";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { designHandoffStateAtom } from "@/atoms/designAtoms";

export function DyadExitDesign() {
  const chatId = useAtomValue(selectedChatIdAtom);
  const handoffState = useAtomValue(designHandoffStateAtom);
  const isTransitioning = chatId
    ? handoffState.transitioningChatIds.has(chatId)
    : false;

  const [dotCount, setDotCount] = useState(0);
  useEffect(() => {
    if (!isTransitioning) return;
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, [isTransitioning]);

  return (
    <div className="my-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <CheckCircle className="flex-shrink-0 text-amber-500" size={24} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-900 dark:text-amber-100">
            Design approved
          </span>
          <ArrowRight className="text-amber-500" size={16} />
          <span className="text-amber-800 dark:text-amber-200">
            {isTransitioning
              ? `Opening a build chat${".".repeat(dotCount + 1)}`
              : "Build started in a new chat"}
          </span>
        </div>
      </div>
    </div>
  );
}
