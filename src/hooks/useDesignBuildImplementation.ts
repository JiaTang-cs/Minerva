import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { pendingDesignBuildAtom } from "@/atoms/designAtoms";
import {
  isStreamingByIdAtom,
  chatMessagesByIdAtom,
  chatErrorByIdAtom,
} from "@/atoms/chatAtoms";
import { ipc } from "@/ipc/types";

/**
 * Starts a new implementation chat after design mode exits.
 * Sends a display-friendly /build message while the backend expands the
 * hidden /build-from-design command into the full implementation prompt.
 */
export function useDesignBuildImplementation() {
  const pendingBuild = useAtomValue(pendingDesignBuildAtom);
  const setPendingBuild = useSetAtom(pendingDesignBuildAtom);
  const isStreamingById = useAtomValue(isStreamingByIdAtom);
  const setIsStreamingById = useSetAtom(isStreamingByIdAtom);
  const setMessagesById = useSetAtom(chatMessagesByIdAtom);
  const setErrorById = useSetAtom(chatErrorByIdAtom);

  const hasTriggeredRef = useRef(false);
  const wasStreamingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingBuild) {
      hasTriggeredRef.current = false;
      wasStreamingRef.current = false;
      return;
    }

    const isNowStreaming = isStreamingById.get(pendingBuild.chatId) ?? false;
    const wasStreaming = wasStreamingRef.current;
    wasStreamingRef.current = isNowStreaming;

    const streamJustCompleted = wasStreaming && !isNowStreaming;
    const neverWasStreaming = !wasStreaming && !isNowStreaming;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (
      !hasTriggeredRef.current &&
      (streamJustCompleted || neverWasStreaming)
    ) {
      hasTriggeredRef.current = true;
      const buildToStart = pendingBuild;

      timeoutId = setTimeout(() => {
        const chatId = buildToStart.chatId;
        const prompt = `/build-from-design=${buildToStart.draftId}`;

        setIsStreamingById((prev) => {
          const next = new Map(prev);
          next.set(chatId, true);
          return next;
        });

        setErrorById((prev) => {
          const next = new Map(prev);
          next.set(chatId, null);
          return next;
        });

        ipc.chatStream.start(
          {
            chatId,
            prompt,
            selectedComponents: [],
          },
          {
            onChunk: ({
              messages: updatedMessages,
              streamingMessageId,
              streamingContent,
            }) => {
              if (!isMountedRef.current) return;

              if (updatedMessages) {
                setMessagesById((prev) => {
                  const next = new Map(prev);
                  next.set(chatId, updatedMessages);
                  return next;
                });
              } else if (
                streamingMessageId !== undefined &&
                streamingContent !== undefined
              ) {
                setMessagesById((prev) => {
                  const existingMessages = prev.get(chatId);
                  if (!existingMessages) return prev;

                  const next = new Map(prev);
                  const updated = existingMessages.map((msg) =>
                    msg.id === streamingMessageId
                      ? { ...msg, content: streamingContent }
                      : msg,
                  );
                  next.set(chatId, updated);
                  return next;
                });
              }
            },
            onEnd: () => {
              if (!isMountedRef.current) return;
              setIsStreamingById((prev) => {
                const next = new Map(prev);
                next.set(chatId, false);
                return next;
              });
            },
            onError: ({ error }) => {
              if (!isMountedRef.current) return;
              console.error("Design build stream error:", error);
              setErrorById((prev) => {
                const next = new Map(prev);
                next.set(chatId, error);
                return next;
              });
              setIsStreamingById((prev) => {
                const next = new Map(prev);
                next.set(chatId, false);
                return next;
              });
            },
          },
        );

        setPendingBuild(null);
      }, 100);
    }

    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    isStreamingById,
    pendingBuild,
    setErrorById,
    setIsStreamingById,
    setMessagesById,
    setPendingBuild,
  ]);
}
