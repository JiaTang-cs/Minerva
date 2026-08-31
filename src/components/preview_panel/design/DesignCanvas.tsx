import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { ArrowDownRight, Boxes, Component, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { showError } from "@/lib/toast";
import {
  buildEdgePath,
  buildMinimapViewModel,
  computeViewportForBounds,
  computeWorldBounds,
  DEFAULT_VIEWPORT,
  DEVICE_DIMENSIONS,
  getPagePreviewNodeSize,
  MINIMAP_SIZE,
  type CanvasEdge,
  type CanvasNodeComponentData,
  type CanvasTool,
  type CanvasViewportState,
  type CanvasNodeDraftData,
  type DesignViewMode,
  type DeviceMode,
  type FlowCanvasNode,
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
  selectedComponentId,
  nodes,
  edges,
  zoomPresetRequest,
  requestSerializedHtml,
  onZoomPercentChange,
  onRuntimeReady,
  onSelectedElementChange,
  onInspectorReset,
  onSerializedHtml,
  onPageNodeSelect,
  onComponentNodeSelect,
}: {
  draftId: string;
  draftTitle: string;
  srcDoc: string;
  deviceMode: DeviceMode;
  viewMode: DesignViewMode;
  canvasTool: CanvasTool;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  selectedElement: SelectedElementSnapshot | null;
  selectedComponentId: string | null;
  nodes: FlowCanvasNode[];
  edges: CanvasEdge[];
  zoomPresetRequest: { id: number; value: number };
  requestSerializedHtml: () => Promise<string | null>;
  onZoomPercentChange: (zoomPercent: number) => void;
  onRuntimeReady: () => void;
  onSelectedElementChange: (element: SelectedElementSnapshot | null) => void;
  onInspectorReset: () => void;
  onSerializedHtml: (payload: { html: string; requestId?: string }) => void;
  onPageNodeSelect: (draftId: string) => void;
  onComponentNodeSelect: (componentId: string) => void;
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
  const [viewport, setViewport] =
    useState<CanvasViewportState>(DEFAULT_VIEWPORT);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [, setIsDraggingElement] = useState(false);
  const [contentHeight, setContentHeight] = useState(900);
  const activeFrameDimensions = DEVICE_DIMENSIONS[deviceMode];
  const activeNodeHeight = Math.max(
    contentHeight,
    activeFrameDimensions.height,
  );
  const isCanvasEditingEnabled =
    viewMode === "edit" && canvasTool === "select" && !isPanning;

  const graphNodes = useMemo(
    () =>
      nodes.map((node) => {
        if (
          "draftId" in node.data &&
          node.data.draftId === draftId &&
          node.data.isActive
        ) {
          return {
            ...node,
            width: activeFrameDimensions.width,
            height: activeNodeHeight,
          };
        }

        return node;
      }),
    [activeFrameDimensions.width, activeNodeHeight, draftId, nodes],
  );

  const nodeById = useMemo(
    () => new Map(graphNodes.map((node) => [node.id, node])),
    [graphNodes],
  );

  const minimapViewModel = useMemo(
    () =>
      buildMinimapViewModel({
        nodes: graphNodes,
        viewport,
        viewportWidth: viewportSize.width,
        viewportHeight: viewportSize.height,
      }),
    [graphNodes, viewport, viewportSize.height, viewportSize.width],
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
    if (
      viewportSize.width === 0 ||
      viewportSize.height === 0 ||
      graphNodes.length === 0
    ) {
      return;
    }

    const viewportKey = `${draftId}:${deviceMode}:${graphNodes
      .map(
        (node) =>
          `${node.id}:${Math.round(node.width)}:${Math.round(node.height)}`,
      )
      .join("|")}`;
    if (initializedViewportKeyRef.current === viewportKey) return;

    initializedViewportKeyRef.current = viewportKey;
    const bounds = computeWorldBounds(
      graphNodes,
      graphNodes.length > 1 ? 280 : 160,
    );
    setViewport(
      graphNodes.length > 1
        ? computeViewportForBounds({
            bounds,
            viewportWidth: viewportSize.width,
            viewportHeight: viewportSize.height,
            preferredZoom: 0.34,
          })
        : {
            ...DEFAULT_VIEWPORT,
            panX:
              (viewportSize.width -
                activeFrameDimensions.width * DEFAULT_VIEWPORT.zoom) /
              2,
            panY: Math.max(
              96,
              (viewportSize.height - activeNodeHeight * DEFAULT_VIEWPORT.zoom) /
                2,
            ),
          },
    );
  }, [
    activeFrameDimensions.width,
    activeNodeHeight,
    deviceMode,
    draftId,
    graphNodes,
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

  const activeComponent = useMemo(() => {
    if (!selectedComponentId) return null;
    const node = nodes.find((candidate) => {
      if (!("componentId" in candidate.data)) return false;
      return candidate.data.componentId === selectedComponentId;
    });

    return node && "componentId" in node.data ? node : null;
  }, [nodes, selectedComponentId]);

  return (
    <div className="relative h-full overflow-hidden bg-background">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(148,163,184,0.35) 1.2px, transparent 1.2px)",
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
        className="absolute right-6 top-[108px] z-20 h-[132px] w-[184px] rounded-[16px] border border-border bg-card/95 p-3 text-left shadow-[0_14px_32px_rgba(15,23,42,0.08)] transition-transform hover:scale-[1.01]"
      >
        <div className="relative h-full overflow-hidden rounded-[12px] border border-border bg-muted/30">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(203,213,225,0.85) 1px, transparent 1px)",
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
            className="absolute rounded-[10px] border border-slate-300 bg-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.65)]"
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
          canvasTool === "hand" &&
            (isPanning ? "cursor-grabbing" : "cursor-grab"),
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
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={1}
            height={1}
          >
            {edges.map((edge) => {
              const fromNode = nodeById.get(edge.from);
              const toNode = nodeById.get(edge.to);
              if (!fromNode || !toNode) return null;

              const path = buildEdgePath({ fromNode, toNode });
              const endX = toNode.x + toNode.width / 2;
              const endY = toNode.y;
              const labelX = (fromNode.x + fromNode.width / 2 + endX) / 2;
              const labelY = (fromNode.y + fromNode.height + endY) / 2 - 16;

              return (
                <g key={edge.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke={
                      edge.type === "component-link"
                        ? "rgba(86, 138, 111, 0.58)"
                        : "rgba(100, 116, 139, 0.38)"
                    }
                    strokeDasharray={
                      edge.type === "component-link" ? "10 8" : "14 10"
                    }
                    strokeWidth={2}
                  />
                  <circle
                    cx={endX}
                    cy={endY}
                    r={5}
                    fill="#f8fafc"
                    stroke="#cbd5e1"
                  />
                  {edge.label ? (
                    <g transform={`translate(${labelX}, ${labelY})`}>
                      <rect
                        x={-28}
                        y={-12}
                        width={56}
                        height={24}
                        rx={12}
                        fill="rgba(255,255,255,0.92)"
                        stroke="rgba(203,213,225,0.9)"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#475569"
                      >
                        {edge.label}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </svg>

          {graphNodes.map((node) => {
            if ("componentId" in node.data) {
              const componentData = node.data as CanvasNodeComponentData;
              const isSelected =
                componentData.componentId === selectedComponentId;
              const previewHtml = componentData.previewHtml
                ? `<!DOCTYPE html><html><head><style>body{margin:0;padding:16px;background:#f8fafc;font-family:ui-sans-serif,system-ui,sans-serif;overflow:hidden;}</style></head><body>${componentData.previewHtml}</body></html>`
                : null;

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() =>
                    onComponentNodeSelect(componentData.componentId)
                  }
                  className={cn(
                    "absolute overflow-hidden rounded-[24px] border bg-white text-left shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-1",
                    isSelected
                      ? "border-[#7ba88e] ring-2 ring-[#d4e8d9]"
                      : "border-[#d8e3dc]",
                  )}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: node.height,
                  }}
                >
                  <div className="flex items-center justify-between border-b border-[#edf2ee] bg-[#f4faf5] px-4 py-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#59806a]">
                        Shared Component
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[#244132]">
                        {componentData.name}
                      </div>
                    </div>
                    <div className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#5d7f69] shadow-sm">
                      Reusable
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    {componentData.description ? (
                      <p className="mb-3 line-clamp-2 text-xs leading-5 text-[#567060]">
                        {componentData.description}
                      </p>
                    ) : null}
                    <div className="relative h-[108px] overflow-hidden rounded-[18px] border border-[#e1ebe4] bg-[#fffdf8]">
                      {previewHtml ? (
                        <iframe
                          title={componentData.name}
                          sandbox="allow-same-origin allow-scripts"
                          className="h-full w-full border-0 bg-white"
                          srcDoc={previewHtml}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-[#7b8d83]">
                          Preview pending
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            }

            const pageData = node.data as CanvasNodeDraftData;
            const isActive = pageData.isActive;
            const pageStatusTone =
              pageData.status === "failed"
                ? "bg-red-50 text-red-700"
                : pageData.status === "generating"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-muted text-muted-foreground";

            if (isActive) {
              return (
                <div
                  key={node.id}
                  className="absolute"
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: node.height,
                  }}
                >
                  <div className="absolute inset-0 rounded-[18px] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)] ring-1 ring-border" />
                  <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
                    <div className="rounded-full bg-[#111827] px-3 py-1.5 text-[11px] font-semibold text-white">
                      {pageData.role === "root" ? "Root Page" : "Active Page"}
                    </div>
                    <div
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-semibold",
                        pageStatusTone,
                      )}
                    >
                      {pageData.status}
                    </div>
                  </div>
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
              );
            }

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onPageNodeSelect(pageData.draftId)}
                className={cn(
                  "absolute overflow-hidden rounded-[24px] border bg-white text-left shadow-[0_16px_40px_rgba(15,23,42,0.07)] transition-transform hover:-translate-y-1",
                  node.selected
                    ? "border-primary/60 ring-2 ring-primary/20"
                    : "border-border",
                )}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                }}
              >
                {(() => {
                  const previewSizing = getPagePreviewNodeSize(
                    pageData.deviceMode,
                  );
                  const previewScale = Math.min(
                    previewSizing.previewWidth /
                      DEVICE_DIMENSIONS[pageData.deviceMode].width,
                    previewSizing.previewHeight /
                      DEVICE_DIMENSIONS[pageData.deviceMode].height,
                  );
                  const chromeHeight =
                    node.height - previewSizing.previewHeight;

                  return (
                    <>
                      <div
                        className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3"
                        style={{ height: `${chromeHeight - 40}px` }}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {pageData.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            <span>
                              {pageData.role === "root" ? "Root" : "Generated"}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-border" />
                            <span>
                              {DEVICE_DIMENSIONS[pageData.deviceMode].label}
                            </span>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                            pageStatusTone,
                          )}
                        >
                          {pageData.status}
                        </div>
                      </div>
                      <div
                        className="relative overflow-hidden bg-muted/30"
                        style={{ height: `${previewSizing.previewHeight}px` }}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(248,250,252,0.9),rgba(241,245,249,0.65))]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          {pageData.srcDoc ? (
                            <div
                              className="relative overflow-hidden rounded-[18px] border border-border bg-white shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                              style={{
                                width: `${previewSizing.previewWidth}px`,
                                height: `${previewSizing.previewHeight}px`,
                              }}
                            >
                              <iframe
                                title={pageData.title}
                                sandbox="allow-same-origin allow-scripts"
                                className="pointer-events-none border-0 bg-white"
                                srcDoc={pageData.srcDoc}
                                style={{
                                  width: `${DEVICE_DIMENSIONS[pageData.deviceMode].width}px`,
                                  height: `${DEVICE_DIMENSIONS[pageData.deviceMode].height}px`,
                                  transform: `scale(${previewScale})`,
                                  transformOrigin: "top left",
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                              Page preview pending
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Link2 className="h-3.5 w-3.5" />
                          {pageData.role === "root"
                            ? "Source anchor"
                            : "Derived from root"}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium text-primary">
                          Open
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </button>
            );
          })}
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
      ) : activeComponent ? (
        <div className="absolute bottom-8 right-8 z-20 w-[280px] rounded-[24px] border border-white/70 bg-white/96 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#eff6f0] text-[#4b7a61]">
              <Component className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#62816d]">
                Shared Component
              </div>
              <div className="mt-1 text-sm font-semibold text-[#243a2c]">
                {(activeComponent.data as CanvasNodeComponentData).name}
              </div>
              <p className="mt-2 text-xs leading-5 text-[#5a7260]">
                {(activeComponent.data as CanvasNodeComponentData)
                  .description ??
                  "This reusable block is shared across the flow and rendered on the canvas for quick inspection."}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-[#6e8175]">
                <Boxes className="h-3.5 w-3.5" />
                Click another component node to inspect it
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
