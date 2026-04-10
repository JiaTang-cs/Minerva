import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { pendingAskUserQuestionAtom } from "@/atoms/designAtoms";
import { designEventClient, type App } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import { useSettings } from "./useSettings";

export function useDesignEvents() {
  const queryClient = useQueryClient();
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const setPendingAskUserQuestion = useSetAtom(pendingAskUserQuestionAtom);
  const { settings } = useSettings();

  const selectedAppIdRef = useRef(selectedAppId);
  selectedAppIdRef.current = selectedAppId;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const unsubscribeAskUserQuestion = designEventClient.onAskUserQuestion(
      (payload) => {
        setPendingAskUserQuestion((prev) => {
          const next = new Map(prev);
          next.set(payload.chatId, payload);
          return next;
        });

        const app = queryClient.getQueryData<App | null>(
          queryKeys.apps.detail({ appId: selectedAppIdRef.current }),
        );
        const notificationsEnabled =
          settingsRef.current?.enableChatEventNotifications === true;

        if (
          notificationsEnabled &&
          Notification.permission === "granted" &&
          !document.hasFocus()
        ) {
          new Notification(app?.name ?? "Dyad", {
            body: "Ask user question needs your input",
          });
        }
      },
    );

    return () => {
      unsubscribeAskUserQuestion();
    };
  }, [queryClient, setPendingAskUserQuestion]);
}
