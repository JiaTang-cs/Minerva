import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import {
  previewModeAtom,
  selectedAppIdAtom,
} from "@/atoms/appAtoms";
import {
  designHandoffStateAtom,
  pendingAskUserQuestionAtom,
  pendingDesignBuildAtom,
} from "@/atoms/designAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { designClient, designEventClient, type App } from "@/ipc/types";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import { showError } from "@/lib/toast";
import { useSettings } from "./useSettings";

export function useDesignEvents() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const setPendingAskUserQuestion = useSetAtom(pendingAskUserQuestionAtom);
  const setPendingDesignBuild = useSetAtom(pendingDesignBuildAtom);
  const setDesignHandoffState = useSetAtom(designHandoffStateAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const setPreviewMode = useSetAtom(previewModeAtom);
  const { settings, updateSettings } = useSettings();

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
          new Notification(app?.name ?? "Minerva", {
            body: "Ask user question needs your input",
          });
        }
      },
    );

    const unsubscribeExit = designEventClient.onExit(async (payload) => {
      setDesignHandoffState((prev) => {
        const nextAccepted = new Set(prev.acceptedChatIds);
        nextAccepted.add(payload.chatId);
        return {
          ...prev,
          acceptedChatIds: nextAccepted,
        };
      });

      try {
        await ipc.chat.cancelStream(payload.chatId);
      } catch (error) {
        console.error("Failed to cancel design stream:", error);
      }

      setDesignHandoffState((prev) => {
        const nextTransitioning = new Set(prev.transitioningChatIds);
        nextTransitioning.add(payload.chatId);
        return {
          ...prev,
          transitioningChatIds: nextTransitioning,
        };
      });

      if (settingsRef.current?.selectedChatMode === "design") {
        updateSettings({ selectedChatMode: "local-agent" });
      }
      setPreviewMode("preview");

      if (!selectedAppIdRef.current) {
        showError("Failed to start build. No app is selected.");
        setDesignHandoffState((prev) => {
          const nextTransitioning = new Set(prev.transitioningChatIds);
          nextTransitioning.delete(payload.chatId);
          return {
            ...prev,
            transitioningChatIds: nextTransitioning,
          };
        });
        return;
      }

      try {
        await designClient.getDraft({
          appId: selectedAppIdRef.current,
          draftId: payload.draftId,
        });
      } catch {
        showError("Failed to load the latest design draft for building.");
        setDesignHandoffState((prev) => {
          const nextTransitioning = new Set(prev.transitioningChatIds);
          nextTransitioning.delete(payload.chatId);
          return {
            ...prev,
            transitioningChatIds: nextTransitioning,
          };
        });
        return;
      }

      try {
        const newChatId = await ipc.chat.createChat(selectedAppIdRef.current);
        setSelectedChatId(newChatId);
        navigate({ to: "/chat", search: { id: newChatId } });
        queryClient.invalidateQueries({
          queryKey: queryKeys.chats.all,
        });
        setPendingDesignBuild({
          chatId: newChatId,
          draftId: payload.draftId,
          sourceDesignChatId: payload.chatId,
        });
      } catch (error) {
        console.error("Failed to create new chat for design build:", error);
        showError("Failed to start a new build chat.");
      } finally {
        setDesignHandoffState((prev) => {
          const nextTransitioning = new Set(prev.transitioningChatIds);
          nextTransitioning.delete(payload.chatId);
          return {
            ...prev,
            transitioningChatIds: nextTransitioning,
          };
        });
      }
    });

    return () => {
      unsubscribeAskUserQuestion();
      unsubscribeExit();
    };
  }, [
    navigate,
    queryClient,
    setDesignHandoffState,
    setPendingAskUserQuestion,
    setPendingDesignBuild,
    setPreviewMode,
    setSelectedChatId,
    updateSettings,
  ]);
}
