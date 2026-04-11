import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import { showError } from "@/lib/toast";
import {
  buildMinimapViewModel,
  DEFAULT_VIEWPORT,
  DEVICE_DIMENSIONS,
  MINIMAP_SIZE,
  type CanvasTool,
  type CanvasViewportState,
  type DesignViewMode,
  type DeviceMode,
  type SelectedElementSnapshot,
} from "./designCanvasUtils";

export function DesignCanvas({
  draftId,
  draftTitle,
  srcDoc,
  deviceMode,
  viewMode,
  canvasTool,
  iframeRef,
  selectedElement,
  zoomPresetRequest,
  requestSerializedHtml,
  onZoomPercentChange,
  onRuntimeReady,
  onSelectedElementChange,
  onInspectorReset,
  onSerializedHtml,
}: {
  draftId: string;
  draftTitle: string;
  srcDoc: string;
  deviceMode: DeviceMode;
  viewMode: DesignViewMode;
  canvasTool: CanvasTool;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  selectedElement: SelectedElementSnapshot | null;
  zoomPresetRequest: { id: number; value: number };
  requestSerializedHtml: () => Promise<string | null>;
  onZoomPercentChange: (zoomPercent: number) => void;
  onRuntimeReady: () => void;
  onSelectedElementChange: (element: SelectedElementSnapshot | null) => void;
  onInspectorReset: () => void;
  onSerializedHtml: (payload: { html: string; requestId?: string }) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const initializedViewportKeyRef = useRef<string | null>(null);
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const [viewport, setViewport] = useState<CanvasViewportState>(DEFAULT_VIEWPORT);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [, setIsDraggingElement] = useState(false);
  const [contentHeight, setContentHeight] = useState(900);
  const frameDimensions = DEVICE_DIMENSIONS[deviceMode];
  const nodeHeight = Math.max(contentHeight, frameDimensions.height);
  const isCanvasEditingEnabled =
    viewMode === "edit" &&
    canvasTool === "select" &&
    !isPanning;

  const canvasNodes = useMemo(
    () => [
      {
        id: draftId,
        type: "design-draft" as const,
        x: 0,
        y: 0,
        width: frameDimensions.width,
        height: nodeHeight,
        selected: true,
      },
    ],
    [draftId, frameDimensions.width, nodeHeight],
  );

  const minimapViewModel = useMemo(
    () =>
      buildMinimapViewModel({
        nodes: canvasNodes,
        viewport,
        viewportWidth: viewportSize.width,
        viewportHeight: viewportSize.height,
      }),
    [canvasNodes, viewport, viewportSize.height, viewportSize.width],
  );

  useEffect(() => {
    onZoomPercentChange(Math.round(viewport.zoom * 100));
  }, [onZoomPercentChange, viewport.zoom]);

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) return;

    const updateSize = () => {
      const rect = viewportElement.getBoundingClientRect();
      setViewportSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(viewportElement);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (viewportSize.width === 0 || viewportSize.height === 0) return;

    const viewportKey = `${draftId}:${deviceMode}`;
    if (initializedViewportKeyRef.current === viewportKey) return;

    initializedViewportKeyRef.current = viewportKey;
    setViewport((current) => ({
      ...current,
      panX: (viewportSize.width - frameDimensions.width * current.zoom) / 2,
      panY: Math.max(96, (viewportSize.height - nodeHeight * current.zoom) / 2),
    }));
  }, [
    deviceMode,
    draftId,
    frameDimensions.width,
    nodeHeight,
    viewportSize.height,
    viewportSize.width,
  ]);

  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return;

    iframeWindow.postMessage(
      {
        type: "dyad-design:set-edit-mode",
        enabled: isCanvasEditingEnabled,
      },
      "*",
    );

    if (!isCanvasEditingEnabled) {
      iframeWindow.postMessage({ type: "dyad-design:clear-selection" }, "*");
      onSelectedElementChange(null);
      onInspectorReset();
    }
  }, [
    iframeRef,
    isCanvasEditingEnabled,
    onInspectorReset,
    onSelectedElementChange,
  ]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data.type !== "string") return;

      if (data.type === "dyad-design:ready") {
        onRuntimeReady();
        return;
      }

      if (data.type === "dyad-design:selected") {
        onSelectedElementChange(data.payload as SelectedElementSnapshot);
        return;
      }

      if (
        data.type === "dyad-design:content-height" &&
        typeof data.height === "number"
      ) {
        setContentHeight(Math.max(700, Math.ceil(data.height)));
        return;
      }

      if (
        data.type === "dyad-design:serialized-html" &&
        typeof data.html === "string"
      ) {
        onSerializedHtml({
          html: data.html,
          requestId:
            typeof data.requestId === "string" ? data.requestId : undefined,
        });
        return;
      }

      if (data.type === "dyad-design:element-removed") {
        if (data.success) {
          onSelectedElementChange(null);
          onInspectorReset();
          return;
        }

        if (typeof data.error === "string") {
          showError(data.error);
        }
        return;
      }

      if (data.type === "dyad-design:drag-started") {
        setIsDraggingElement(true);
        return;
      }

      if (data.type === "dyad-design:drag-ended") {
        setIsDraggingElement(false);
        if (data.relocated) {
          setTimeout(() => {
            void requestSerializedHtml();
          }, 100);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    iframeRef,
    onInspectorReset,
    onRuntimeReady,
    onSelectedElementChange,
    onSerializedHtml,
    requestSerializedHtml,
  ]);

  useEffect(() => {
    const anchor = {
      x: viewportSize.width / 2,
      y: viewportSize.height / 2,
    };

    setViewport((current) => {
      const nextZoom = zoomPresetRequest.value / 100;
      if (
        current.zoom === nextZoom ||
        viewportSize.width === 0 ||
        viewportSize.height === 0
      ) {
        return current;
      }

      const worldX = (anchor.x - current.panX) / current.zoom;
      const worldY = (anchor.y - current.panY) / current.zoom;

      return {
        ...current,
        zoom: nextZoom,
        panX: anchor.x - worldX * nextZoom,
        panY: anchor.y - worldY * nextZoom,
      };
    });
  }, [viewportSize.height, viewportSize.width, zoomPresetRequest]);

  const zoomAtPoint = (nextZoom: number, anchor: { x: number; y: number }) => {
    setViewport((current) => {
      const clampedZoom = Math.min(
        current.maxZoom,
        Math.max(current.minZoom, nextZoom),
      );

      if (clampedZoom === current.zoom) {
        return current;
      }

      const worldX = (anchor.x - current.panX) / current.zoom;
      const worldY = (anchor.y - current.panY) / current.zoom;

      return {
        ...current,
        zoom: clampedZoom,
        panX: anchor.x - worldX * clampedZoom,
        panY: anchor.y - worldY * clampedZoom,
      };
    });
  };

  const beginPan = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    panDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: viewport.panX,
      startPanY: viewport.panY,
    };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePanMove = (event: React.PointerEvent<HTMLElement>) => {
    const panDrag = panDragRef.current;
    if (!panDrag || panDrag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - panDrag.startX;
    const deltaY = event.clientY - panDrag.startY;

    setViewport((current) => ({
      ...current,
      panX: panDrag.startPanX + deltaX,
      panY: panDrag.startPanY + deltaY,
    }));
  };

  const endPan = (event: React.PointerEvent<HTMLElement>) => {
    const panDrag = panDragRef.current;
    if (!panDrag || panDrag.pointerId !== event.pointerId) return;

    panDragRef.current = null;
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleViewportWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) {
      const rect = event.currentTarget.getBoundingClientRect();
      const zoomDelta = event.deltaY > 0 ? -0.08 : 0.08;
      zoomAtPoint(viewport.zoom + zoomDelta, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      event.preventDefault();
      return;
    }

    if (canvasTool !== "hand") return;

    setViewport((current) => ({
      ...current,
      panX: current.panX - event.deltaX,
      panY: current.panY - event.deltaY,
    }));
    event.preventDefault();
  };

  const focusWorldPoint = (worldX: number, worldY: number) => {
    setViewport((current) => ({
      ...current,
      panX: viewportSize.width / 2 - worldX * current.zoom,
      panY: viewportSize.height / 2 - worldY * current.zoom,
    }));
  };

  const handleMinimapPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const worldX =
      (localX - MINIMAP_SIZE.padding) / minimapViewModel.scale +
      minimapViewModel.bounds.minX;
    const worldY =
      (localY - MINIMAP_SIZE.padding) / minimapViewModel.scale +
      minimapViewModel.bounds.minY;

    focusWorldPoint(worldX, worldY);
  };

  return (
    <div className="relative h-full overflow-hidden bg-[#f6f2eb]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(194,170,136,0.45) 1.2px, transparent 1.2px)",
          backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
          backgroundSize: `${Math.max(14, 22 * viewport.zoom)}px ${Math.max(
            14,
            22 * viewport.zoom,
          )}px`,
        }}
      />

      <button
        type="button"
        onPointerDown={handleMinimapPointerDown}
        className="absolute right-6 top-[108px] z-20 h-[132px] w-[184px] rounded-[16px] border border-[#e8e1d6] bg-white/96 p-3 text-left shadow-[0_14px_32px_rgba(15,23,42,0.08)] transition-transform hover:scale-[1.01]"
      >
        <div className="relative h-full overflow-hidden rounded-[12px] border border-[#ebe5dc] bg-[#faf8f4]">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(216,206,192,0.85) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />

          {minimapViewModel.items.map((item) => (
            <div
              key={item.id}
              className="absolute rounded-[8px] border border-white/60 shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
              style={{
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                backgroundColor: item.color,
                boxShadow: item.selected
                  ? "0 0 0 1px rgba(124,58,237,0.2), 0 4px 12px rgba(15,23,42,0.08)"
                  : undefined,
              }}
            />
          ))}

          <div
            className="absolute rounded-[10px] border border-[#d6ccbe] bg-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.65)]"
            style={{
              left: minimapViewModel.viewportRect.x,
              top: minimapViewModel.viewportRect.y,
              width: minimapViewModel.viewportRect.width,
              height: minimapViewModel.viewportRect.height,
            }}
          />
        </div>
      </button>

      <div
        ref={viewportRef}
        className={cn(
          "absolute inset-0 overflow-hidden touch-none",
          canvasTool === "hand" && (isPanning ? "cursor-grabbing" : "cursor-grab"),
        )}
        onWheel={handleViewportWheel}
        onPointerDown={(event) => {
          if (canvasTool === "hand") {
            beginPan(event);
          }
        }}
        onPointerMove={handlePanMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div
          className="absolute left-0 top-0 will-change-transform"
          style={{
            transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <div
            className="relative"
            style={{
              width: `${frameDimensions.width}px`,
              height: `${nodeHeight}px`,
            }}
          >
            <div className="absolute inset-0 rounded-[18px] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)] ring-1 ring-[#e7dfd4]" />
            <iframe
              ref={iframeRef}
              title={`Design draft ${draftTitle}`}
              sandbox="allow-same-origin allow-scripts"
              className={cn(
                "relative h-full w-full rounded-[18px] border-0 bg-white",
                canvasTool === "hand" && "pointer-events-none",
              )}
              srcDoc={srcDoc}
            />
            {canvasTool === "hand" ? (
              <div className="absolute inset-0 rounded-[18px] bg-transparent" />
            ) : null}
          </div>
        </div>
      </div>

      {selectedElement ? (
        <div className="absolute bottom-8 right-8 z-20 rounded-[20px] border border-white/70 bg-white/96 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div className="text-[13px] font-medium text-slate-900">
            {selectedElement.tagName}
          </div>
          <div className="max-w-[220px] truncate text-[11px] text-slate-500">
            {selectedElement.text || "Selected element"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
