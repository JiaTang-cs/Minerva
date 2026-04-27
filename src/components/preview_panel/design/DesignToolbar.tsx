import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Eye,
  GripHorizontal,
  Hand,
  Layers3,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  MousePointer2,
  MoveHorizontal,
  Palette,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  Smartphone,
  Tablet,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DEVICE_DIMENSIONS,
  type CanvasTool,
  type DesignViewMode,
  type DeviceMode,
  type InspectorPanel,
} from "./designCanvasUtils";

export function DesignToolbar({
  chatId,
  draftTitle,
  viewMode,
  canvasTool,
  deviceMode,
  inspectorPanel,
  isChatPanelHidden,
  isBuildAccepted,
  isBuildTransitioning,
  isStartingBuild,
  isStreaming,
  isSaving,
  isDirty,
  saveStatus,
  zoomPercent,
  hasSelectedElement,
  onBuildFromDesign,
  onToggleChatPanel,
  onViewModeChange,
  onCanvasToolChange,
  onInspectorPanelChange,
  onRemoveSelectedElement,
  onDeviceModeChange,
  onZoomPresetSelect,
  onReset,
}: {
  chatId: string;
  draftTitle: string;
  viewMode: DesignViewMode;
  canvasTool: CanvasTool;
  deviceMode: DeviceMode;
  inspectorPanel: InspectorPanel;
  isChatPanelHidden: boolean;
  isBuildAccepted: boolean;
  isBuildTransitioning: boolean;
  isStartingBuild: boolean;
  isStreaming: boolean;
  isSaving: boolean;
  isDirty: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  zoomPercent: number;
  hasSelectedElement: boolean;
  onBuildFromDesign: () => void;
  onToggleChatPanel: () => void;
  onViewModeChange: (mode: DesignViewMode) => void;
  onCanvasToolChange: (tool: CanvasTool) => void;
  onInspectorPanelChange: (panel: InspectorPanel) => void;
  onRemoveSelectedElement: () => void;
  onDeviceModeChange: (mode: DeviceMode) => void;
  onZoomPresetSelect: (zoomPercent: number) => void;
  onReset: () => void;
}) {
  return (
    <>
      <div className="absolute left-6 top-4 z-20 flex items-center gap-3 rounded-[20px] border border-white/70 bg-white/95 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur">
        <div className="flex h-8 w-8 items-center justify-center rounded-[16px] bg-primary text-primary-foreground">
          <GripHorizontal className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="max-w-[220px] truncate text-[15px] font-semibold text-slate-900">
            {draftTitle}
          </div>
          <div className="text-[10px] text-slate-400">Chat {chatId}</div>
        </div>
        <Layers3 className="h-[18px] w-[18px] text-slate-400" />
        <div className="ml-2 flex items-center gap-2">
          {isBuildAccepted ? (
            <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700">
              Build started in a new chat
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={onBuildFromDesign}
              disabled={
                isSaving || isStreaming || isStartingBuild || isBuildTransitioning
              }
              className="rounded-full px-4"
            >
              {isBuildTransitioning || isStartingBuild
                ? "Starting build..."
                : "Build from Design"}
            </Button>
          )}
        </div>
      </div>

      <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-[14px] border border-white/70 bg-white/95 p-[3px] shadow-[0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onViewModeChange("view")}
            className={cn(
              "flex h-8 items-center gap-1 rounded-[10px] px-3 text-[11px] font-medium transition-colors",
              viewMode === "view"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Eye className="h-3 w-3" />
            View
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("edit")}
            className={cn(
              "flex h-8 items-center gap-1 rounded-[10px] px-3 text-[11px] font-medium transition-colors",
              viewMode === "edit"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </div>
      </div>

      <div className="absolute right-6 top-4 z-20 flex items-center gap-1.5 rounded-[20px] border border-white/70 bg-white/95 px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur">
        <button
          type="button"
          title={isChatPanelHidden ? "Show chat" : "Hide chat"}
          aria-label={isChatPanelHidden ? "Show chat" : "Hide chat"}
          onClick={onToggleChatPanel}
          className="rounded-[14px] p-2 text-muted-foreground hover:bg-muted"
        >
          {isChatPanelHidden ? (
            <Maximize2 className="h-4 w-4" />
          ) : (
            <Minimize2 className="h-4 w-4" />
          )}
        </button>
        <div className="min-w-[44px] text-center text-[14px] font-semibold text-slate-600">
          {zoomPercent}%
        </div>
      </div>

      <div className="absolute bottom-8 left-6 z-20 flex flex-col gap-1.5 rounded-[24px] border border-white/70 bg-white/96 px-2 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur">
        {[
          { key: "hand", icon: Hand, label: "Hand" },
          { key: "select", icon: MousePointer2, label: "Cursor" },
          { key: "layout", icon: MoveHorizontal, label: "Layout" },
          { key: "styles", icon: Palette, label: "Styles" },
          { key: "pin", icon: Pin, label: "Pin" },
          { key: "create", icon: Plus, label: "Create" },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            title={label}
            onClick={() => {
              if (key === "hand" || key === "select") {
                onCanvasToolChange(key as CanvasTool);
                return;
              }
              if (key === "layout" || key === "styles") {
                onInspectorPanelChange(
                  inspectorPanel === key ? null : (key as InspectorPanel),
                );
              }
            }}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-[16px] text-muted-foreground transition-colors hover:bg-muted",
              (canvasTool === key || inspectorPanel === key) &&
                "bg-muted text-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        ))}
      </div>

      {viewMode === "edit" ? (
        <div className="absolute left-1/2 top-[80px] z-20 -translate-x-1/2 rounded-[18px] border border-white/70 bg-white/95 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur">
          <div className="flex items-center gap-0.5 px-1">
            {[
              {
                key: "pin",
                icon: Pin,
                onClick: () => onInspectorPanelChange(null),
                dividerAfter: true,
              },
              {
                key: "layout",
                icon: MoveHorizontal,
                onClick: () =>
                  onInspectorPanelChange(
                    inspectorPanel === "layout" ? null : "layout",
                  ),
                dividerAfter: true,
              },
              {
                key: "styles",
                icon: Palette,
                onClick: () =>
                  onInspectorPanelChange(
                    inspectorPanel === "styles" ? null : "styles",
                  ),
                dividerAfter: true,
              },
              {
                key: "delete",
                icon: Trash2,
                onClick: onRemoveSelectedElement,
                disabled: !hasSelectedElement,
              },
              {
                key: "more",
                icon: MoreHorizontal,
                onClick: () => onInspectorPanelChange(null),
              },
            ].map(({ key, icon: Icon, onClick, dividerAfter, disabled }) => (
              <React.Fragment key={key}>
                <button
                  type="button"
                  onClick={onClick}
                  disabled={disabled}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-[12px] transition-colors hover:bg-muted",
                    inspectorPanel === key
                      ? "bg-muted text-foreground"
                      : disabled
                        ? "cursor-not-allowed text-slate-300"
                        : "text-slate-500",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
                {dividerAfter ? (
                  <div className="mx-1 h-5 w-px rounded-full bg-border" />
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : null}

      {viewMode === "edit" ? (
        <div className="absolute bottom-[72px] left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/70 bg-white/96 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-blue-600">Saving...</span>
                </>
              ) : null}
              {saveStatus === "saved" ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Saved</span>
                </>
              ) : null}
              {saveStatus === "error" ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Save failed</span>
                </>
              ) : null}
              {saveStatus === "idle" && isDirty ? (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span>Editing...</span>
                </>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="rounded-full"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-[22px] border border-white/70 bg-white/96 px-3 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        {([
          { key: "desktop", icon: Monitor },
          { key: "tablet", icon: Tablet },
          { key: "mobile", icon: Smartphone },
        ] as const).map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onDeviceModeChange(key)}
            className={cn(
              "flex items-center gap-2 rounded-[15px] px-4 py-2 text-[14px] font-medium transition-colors",
              deviceMode === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            {DEVICE_DIMENSIONS[key].label}
          </button>
        ))}

        <div className="mx-2 h-7 w-px bg-border" />

        {[40, 60, 80, 100].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onZoomPresetSelect(value)}
            className={cn(
              "rounded-[14px] px-3 py-2 text-[14px] font-medium transition-colors",
              zoomPercent === value
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {value}%
          </button>
        ))}
      </div>
    </>
  );
}
