import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { designClient } from "@/ipc/types";
import { showError } from "@/lib/toast";
import {
  hasUnsavedDesignChanges,
  normalizeDesignDraftHtml,
} from "../designDraftEditing";
import type {
  DeviceMode,
  InspectorPanel,
  PendingAction,
  SelectedElementSnapshot,
} from "./designCanvasUtils";

type DesignDraft = {
  id: string;
  title: string;
  html: string;
  deviceMode: DeviceMode;
};

type StreamMessageArgs = {
  chatId: number;
  prompt: string;
  onSettled?: () => void;
};

export function useDesignDraftSession({
  appId,
  chatId,
  draft,
  queryClient,
  refetchDraft,
  setDesignDraftDirty,
  clearDesignPendingNavigation,
  isBuildAccepted,
  isBuildTransitioning,
  settingsSelectedChatMode,
  updateSettings,
  streamMessage,
}: {
  appId: number | null | undefined;
  chatId: number | null;
  draft: DesignDraft | null | undefined;
  queryClient: QueryClient;
  refetchDraft: () => Promise<unknown>;
  setDesignDraftDirty: (isDirty: boolean) => void;
  clearDesignPendingNavigation: () => void;
  isBuildAccepted: boolean;
  isBuildTransitioning: boolean;
  settingsSelectedChatMode:
    | "ask"
    | "build"
    | "design"
    | "local-agent"
    | "plan"
    | undefined;
  updateSettings: (next: { selectedChatMode: "design" }) => unknown;
  streamMessage: (args: StreamMessageArgs) => Promise<unknown>;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const serializedHtmlResolversRef = useRef(
    new Map<string, (html: string | null) => void>(),
  );
  const [savedHtml, setSavedHtml] = useState<string | null>(null);
  const [originalHtml, setOriginalHtml] = useState<string | null>(null);
  const [pendingSerializedHtml, setPendingSerializedHtml] = useState<
    string | null
  >(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [isStartingBuild, setIsStartingBuild] = useState(false);
  const [isRuntimeReady, setIsRuntimeReady] = useState(false);
  const [selectedElement, setSelectedElement] =
    useState<SelectedElementSnapshot | null>(null);
  const [inspectorPanel, setInspectorPanel] = useState<InspectorPanel>(null);
  const [localPendingAction, setLocalPendingAction] =
    useState<PendingAction | null>(null);

  const activePendingAction = useMemo(
    () => localPendingAction,
    [localPendingAction],
  );

  useEffect(() => {
    setSelectedElement(null);
    setInspectorPanel(null);
    setSavedHtml(null);
    setOriginalHtml(null);
    setPendingSerializedHtml(null);
    setIsDirty(false);
    setIsRuntimeReady(false);
    setLocalPendingAction(null);
    setIsStartingBuild(false);
    setSaveStatus("idle");
  }, [draft?.id]);

  useEffect(() => {
    if (isBuildAccepted || isBuildTransitioning) {
      setIsStartingBuild(false);
    }
  }, [isBuildAccepted, isBuildTransitioning]);

  useEffect(() => {
    setDesignDraftDirty(isDirty);
  }, [isDirty, setDesignDraftDirty]);

  useEffect(() => {
    return () => {
      serializedHtmlResolversRef.current.forEach((resolve) => resolve(null));
      serializedHtmlResolversRef.current.clear();
      setDesignDraftDirty(false);
      clearDesignPendingNavigation();
    };
  }, [clearDesignPendingNavigation, setDesignDraftDirty]);

  const requestSerializedHtml = useCallback(() => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) {
      return Promise.resolve<string | null>(null);
    }

    const requestId = `design-html-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    return new Promise<string | null>((resolve) => {
      serializedHtmlResolversRef.current.set(requestId, resolve);
      iframeWindow.postMessage(
        {
          type: "dyad-design:get-serialized-html",
          requestId,
        },
        "*",
      );
    });
  }, []);

  useEffect(() => {
    if (draft?.html && !originalHtml) {
      setOriginalHtml(draft.html);
    }
  }, [draft?.html, originalHtml]);

  useEffect(() => {
    if (!isRuntimeReady || savedHtml || !draft) return;

    void requestSerializedHtml().then((html) => {
      if (!html) return;
      setSavedHtml(html);
      setPendingSerializedHtml(html);
      setIsDirty(false);
    });
  }, [draft, isRuntimeReady, requestSerializedHtml, savedHtml]);

  const updateDeviceMode = useCallback(
    async (nextDeviceMode: DeviceMode) => {
      if (!draft || !appId || nextDeviceMode === draft.deviceMode) return;
      await designClient.updateDraft({
        appId,
        draftId: draft.id,
        deviceMode: nextDeviceMode,
      });
      await refetchDraft();
    },
    [appId, draft, refetchDraft],
  );

  const resetDraftToSaved = useCallback(() => {
    if (!originalHtml || !iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage(
      {
        type: "dyad-design:reset-to-html",
        html: originalHtml,
      },
      "*",
    );
    setPendingSerializedHtml(originalHtml);
    setSavedHtml(originalHtml);
    setIsDirty(false);
    setSaveStatus("idle");
    setSelectedElement(null);
    setInspectorPanel(null);
  }, [originalHtml]);

  const saveDesignChanges = useCallback(async () => {
    if (!draft || !appId) return false;

    setIsSaving(true);
    try {
      const htmlToSave =
        pendingSerializedHtml ?? (await requestSerializedHtml()) ?? null;
      if (!htmlToSave) {
        return false;
      }

      await designClient.updateDraft({
        appId,
        draftId: draft.id,
        html: htmlToSave,
      });

      await queryClient.invalidateQueries({
        queryKey: ["design-draft", "forChat", appId, chatId],
        refetchType: "none",
      });
      setSavedHtml(htmlToSave);
      setPendingSerializedHtml(htmlToSave);
      setIsDirty(false);
      return true;
    } catch (error) {
      showError(`Failed to save design draft: ${error}`);
      setSaveStatus("error");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    appId,
    chatId,
    draft,
    pendingSerializedHtml,
    queryClient,
    requestSerializedHtml,
  ]);

  const handleBuildFromDesign = useCallback(async () => {
    if (!chatId || !draft) return;
    if (isStartingBuild || isBuildAccepted || isBuildTransitioning) return;

    setIsStartingBuild(true);
    setSaveStatus("saving");

    try {
      if (settingsSelectedChatMode !== "design") {
        await updateSettings({ selectedChatMode: "design" });
      }
    } catch (error) {
      showError(`Failed to switch to design mode before building: ${error}`);
      setSaveStatus("error");
      setIsStartingBuild(false);
      return;
    }

    const didSave = await saveDesignChanges();
    if (!didSave) {
      setSaveStatus("error");
      setIsStartingBuild(false);
      return;
    }

    setSaveStatus("saved");
    await streamMessage({
      chatId,
      prompt: "/build",
      onSettled: () => {
        if (!isBuildAccepted && !isBuildTransitioning) {
          setIsStartingBuild(false);
        }
      },
    });
  }, [
    chatId,
    draft,
    isBuildAccepted,
    isBuildTransitioning,
    isStartingBuild,
    saveDesignChanges,
    settingsSelectedChatMode,
    streamMessage,
    updateSettings,
  ]);

  useEffect(() => {
    if (!isDirty || !draft || !appId) return;

    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const success = await saveDesignChanges();
        if (success) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [appId, draft, isDirty, saveDesignChanges]);

  const clearPendingAction = useCallback(() => {
    setLocalPendingAction(null);
    clearDesignPendingNavigation();
  }, [clearDesignPendingNavigation]);

  const handleSerializedHtmlMessage = useCallback(
    (payload: { html: string; requestId?: string }) => {
      const normalizedHtml = normalizeDesignDraftHtml(payload.html);
      setPendingSerializedHtml(normalizedHtml);
      setIsDirty(
        savedHtml ? hasUnsavedDesignChanges(savedHtml, normalizedHtml) : false,
      );

      if (typeof payload.requestId === "string") {
        const resolver = serializedHtmlResolversRef.current.get(payload.requestId);
        if (resolver) {
          serializedHtmlResolversRef.current.delete(payload.requestId);
          resolver(normalizedHtml);
        }
      }
    },
    [savedHtml],
  );

  return {
    iframeRef,
    savedHtml,
    originalHtml,
    pendingSerializedHtml,
    isDirty,
    isSaving,
    saveStatus,
    isStartingBuild,
    isRuntimeReady,
    selectedElement,
    inspectorPanel,
    localPendingAction,
    activePendingAction,
    setIsRuntimeReady,
    setSelectedElement,
    setInspectorPanel,
    setLocalPendingAction,
    setSaveStatus,
    requestSerializedHtml,
    saveDesignChanges,
    handleBuildFromDesign,
    resetDraftToSaved,
    updateDeviceMode,
    clearPendingAction,
    handleSerializedHtmlMessage,
  };
}
