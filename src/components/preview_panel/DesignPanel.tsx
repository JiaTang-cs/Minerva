import React, { useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import { Layers3 } from "lucide-react";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import {
  designDraftDirtyAtom,
  designPendingNavigationAtom,
  previewModeAtom,
} from "@/atoms/appAtoms";
import { designHandoffStateAtom } from "@/atoms/designAtoms";
import { isChatPanelHiddenAtom, isPreviewOpenAtom } from "@/atoms/viewAtoms";
import { useDesignDraft } from "@/hooks/useDesignDraft";
import { useSettings } from "@/hooks/useSettings";
import { useStreamChat } from "@/hooks/useStreamChat";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  injectDesignRuntime,
  type CanvasTool,
  type DesignViewMode,
  type DeviceMode,
  type PendingAction,
} from "./design/designCanvasUtils";
import { DesignCanvas } from "./design/DesignCanvas";
import { LayoutInspector, StyleInspector } from "./design/DesignInspector";
import { DesignToolbar } from "./design/DesignToolbar";
import { useDesignDraftSession } from "./design/useDesignDraftSession";

function DesignEmptyState() {
  return (
    <div className="flex h-full items-center justify-center bg-[#f7f4ef] px-8 text-center">
      <div className="max-w-md space-y-3 rounded-[28px] border border-[#e7dfd4] bg-white/90 px-8 py-10 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4efe7] text-[#9a6b2f]">
          <Layers3 className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">
          No design draft yet
        </h3>
        <p className="text-sm leading-6 text-slate-500">
          Ask the design agent to create a page draft. Once the HTML draft is
          generated, it will appear here as a live design canvas.
        </p>
      </div>
    </div>
  );
}

export const DesignPanel: React.FC = () => {
  const chatId = useAtomValue(selectedChatIdAtom);
  const [, setPreviewMode] = useAtom(previewModeAtom);
  const [, setIsPreviewOpen] = useAtom(isPreviewOpenAtom);
  const [isChatPanelHidden, setIsChatPanelHidden] = useAtom(
    isChatPanelHiddenAtom,
  );
  const [, setDesignDraftDirty] = useAtom(designDraftDirtyAtom);
  const [designPendingNavigation, setDesignPendingNavigation] = useAtom(
    designPendingNavigationAtom,
  );
  const designHandoffState = useAtomValue(designHandoffStateAtom);
  const queryClient = useQueryClient();
  const { appId, data: draft, isLoading, refetch } = useDesignDraft();
  const { settings, updateSettings } = useSettings();
  const { streamMessage, isStreaming } = useStreamChat();
  const [viewMode, setViewMode] = useState<DesignViewMode>("edit");
  const [canvasTool, setCanvasTool] = useState<CanvasTool>("select");
  const [zoomPercent, setZoomPercent] = useState(40);
  const [zoomPresetRequest, setZoomPresetRequest] = useState({ id: 0, value: 40 });
  const isBuildAccepted = chatId
    ? designHandoffState.acceptedChatIds.has(chatId)
    : false;
  const isBuildTransitioning = chatId
    ? designHandoffState.transitioningChatIds.has(chatId)
    : false;

  const session = useDesignDraftSession({
    appId,
    chatId,
    draft,
    queryClient,
    refetchDraft: refetch,
    setDesignDraftDirty,
    clearDesignPendingNavigation: () => setDesignPendingNavigation(null),
    isBuildAccepted,
    isBuildTransitioning,
    settingsSelectedChatMode: settings?.selectedChatMode,
    updateSettings,
    streamMessage,
  });

  const srcDoc = useMemo(() => {
    if (!draft?.html) return "";
    return injectDesignRuntime(draft.html);
  }, [draft?.html]);

  const activePendingAction =
    session.localPendingAction ?? designPendingNavigation;

  const applyStylesToSelection = (styles: Record<string, string>) => {
    if (!session.selectedElement || !session.iframeRef.current?.contentWindow) {
      return;
    }

    session.iframeRef.current.contentWindow.postMessage(
      {
        type: "dyad-design:apply-style",
        dyadId: session.selectedElement.dyadId,
        styles,
      },
      "*",
    );
  };

  const removeSelectedElement = () => {
    if (!session.selectedElement || !session.iframeRef.current?.contentWindow) {
      return;
    }

    session.iframeRef.current.contentWindow.postMessage(
      {
        type: "dyad-design:remove-element",
        dyadId: session.selectedElement.dyadId,
      },
      "*",
    );
  };

  const clearPendingAction = () => {
    session.clearPendingAction();
  };

  const performPendingAction = async (action: PendingAction | null) => {
    if (!action) return;

    switch (action.type) {
      case "switch-preview-mode":
        setPreviewMode(action.mode);
        setIsPreviewOpen(true);
        break;
      case "close-preview":
        setIsPreviewOpen(false);
        break;
      case "set-view-mode":
        setViewMode(action.mode);
        break;
      case "set-canvas-tool":
        setCanvasTool(action.tool);
        break;
      case "set-device-mode":
        await session.updateDeviceMode(action.deviceMode);
        break;
    }
  };

  const handleSaveAndContinue = async () => {
    const action = activePendingAction;
    const didSave = await session.saveDesignChanges();
    if (!didSave) return;
    clearPendingAction();
    await performPendingAction(action);
  };

  const handleDiscardAndContinue = async () => {
    const action = activePendingAction;
    session.resetDraftToSaved();
    clearPendingAction();
    await performPendingAction(action);
  };

  const requestViewModeChange = (nextMode: DesignViewMode) => {
    if (nextMode === viewMode) return;
    if (session.isDirty && nextMode === "view") {
      session.setLocalPendingAction({ type: "set-view-mode", mode: nextMode });
      return;
    }

    setViewMode(nextMode);
  };

  const requestCanvasToolChange = (nextTool: CanvasTool) => {
    if (nextTool === canvasTool) return;
    if (session.isDirty && nextTool === "hand") {
      session.setLocalPendingAction({ type: "set-canvas-tool", tool: nextTool });
      return;
    }

    setCanvasTool(nextTool);
  };

  const requestDeviceModeChange = (nextDeviceMode: DeviceMode) => {
    if (!draft || nextDeviceMode === draft.deviceMode) return;
    if (session.isDirty) {
      session.setLocalPendingAction({
        type: "set-device-mode",
        deviceMode: nextDeviceMode,
      });
      return;
    }

    void session.updateDeviceMode(nextDeviceMode);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f7f4ef]">
        <div className="rounded-[28px] border border-[#e7dfd4] bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Loading design canvas...
        </div>
      </div>
    );
  }

  if (!draft || !chatId) {
    return <DesignEmptyState />;
  }

  return (
    <>
      <div className="relative h-full overflow-hidden bg-[#f6f2eb]">
        <DesignCanvas
          draftId={draft.id}
          draftTitle={draft.title}
          srcDoc={srcDoc}
          deviceMode={draft.deviceMode}
          viewMode={viewMode}
          canvasTool={canvasTool}
          iframeRef={session.iframeRef}
          selectedElement={session.selectedElement}
          zoomPresetRequest={zoomPresetRequest}
          requestSerializedHtml={session.requestSerializedHtml}
          onZoomPercentChange={setZoomPercent}
          onRuntimeReady={() => session.setIsRuntimeReady(true)}
          onSelectedElementChange={session.setSelectedElement}
          onInspectorReset={() => session.setInspectorPanel(null)}
          onSerializedHtml={session.handleSerializedHtmlMessage}
        />

        <DesignToolbar
          chatId={String(chatId)}
          draftTitle={draft.title}
          viewMode={viewMode}
          canvasTool={canvasTool}
          deviceMode={draft.deviceMode}
          inspectorPanel={session.inspectorPanel}
          isChatPanelHidden={isChatPanelHidden}
          isBuildAccepted={isBuildAccepted}
          isBuildTransitioning={isBuildTransitioning}
          isStartingBuild={session.isStartingBuild}
          isStreaming={isStreaming}
          isSaving={session.isSaving}
          isDirty={session.isDirty}
          saveStatus={session.saveStatus}
          zoomPercent={zoomPercent}
          hasSelectedElement={!!session.selectedElement}
          onBuildFromDesign={() => void session.handleBuildFromDesign()}
          onToggleChatPanel={() => setIsChatPanelHidden((prev) => !prev)}
          onViewModeChange={requestViewModeChange}
          onCanvasToolChange={requestCanvasToolChange}
          onInspectorPanelChange={session.setInspectorPanel}
          onRemoveSelectedElement={removeSelectedElement}
          onDeviceModeChange={requestDeviceModeChange}
          onZoomPresetSelect={(value) =>
            setZoomPresetRequest((prev) => ({ id: prev.id + 1, value }))
          }
          onReset={session.resetDraftToSaved}
        />

        {viewMode === "edit" && session.inspectorPanel ? (
          <div className="absolute left-1/2 top-[132px] z-20 -translate-x-1/2">
            {session.inspectorPanel === "layout" ? (
              <LayoutInspector
                selectedElement={session.selectedElement}
                onApplyStyles={applyStylesToSelection}
              />
            ) : null}
            {session.inspectorPanel === "styles" ? (
              <StyleInspector
                selectedElement={session.selectedElement}
                onApplyStyles={applyStylesToSelection}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <Dialog
        open={!!activePendingAction}
        onOpenChange={(open) => {
          if (!open) {
            clearPendingAction();
          }
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved design changes</DialogTitle>
            <DialogDescription>
              Save your changes before leaving this editing flow, or discard
              them and continue with the new action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={clearPendingAction}>
              Continue editing
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => void handleDiscardAndContinue()}
              >
                Discard changes
              </Button>
              <Button
                onClick={() => void handleSaveAndContinue()}
                disabled={session.isSaving}
              >
                {session.isSaving ? "Saving..." : "Save and continue"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
