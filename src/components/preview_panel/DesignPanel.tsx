import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAtom, useAtomValue } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  Pencil,
  Hand,
  Palette,
  MoveHorizontal,
  Trash2,
  MoreHorizontal,
  Layers3,
  Pin,
  Smartphone,
  Tablet,
  Monitor,
  Expand,
  MousePointer2,
  Plus,
  GripHorizontal,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Save,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import {
  designDraftDirtyAtom,
  designPendingNavigationAtom,
  previewModeAtom,
} from "@/atoms/appAtoms";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";
import { designClient } from "@/ipc/types";
import { useDesignDraft } from "@/hooks/useDesignDraft";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { NumberInput } from "@/components/ui/NumberInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError } from "@/lib/toast";
import {
  hasUnsavedDesignChanges,
  normalizeDesignDraftHtml,
} from "./designDraftEditing";
import { processNumericValue, rgbToHex } from "@/utils/style-utils";

type DesignViewMode = "view" | "edit";
type InspectorPanel = "layout" | "styles" | null;
type CanvasTool = "hand" | "select";
type DeviceMode = "desktop" | "tablet" | "mobile";
type PreviewMode =
  | "preview"
  | "code"
  | "problems"
  | "configure"
  | "publish"
  | "security"
  | "design";
type PendingAction =
  | { type: "switch-preview-mode"; mode: PreviewMode }
  | { type: "close-preview" }
  | { type: "set-view-mode"; mode: DesignViewMode }
  | { type: "set-canvas-tool"; tool: CanvasTool }
  | { type: "set-device-mode"; deviceMode: DeviceMode };

type CanvasNodeType = "design-draft";

interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
}

interface CanvasWorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface MinimapItem {
  id: string;
  kind: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  selected?: boolean;
}

interface MinimapViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasMinimapViewModel {
  bounds: CanvasWorldBounds;
  scale: number;
  items: MinimapItem[];
  viewportRect: MinimapViewportRect;
}

interface SelectedElementStyles {
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderRadius: string;
  borderWidth: string;
  display: string;
  justifyContent: string;
  alignItems: string;
  padding: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  margin: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  lineHeight: string;
  textAlign: string;
  position: string;
}

interface SelectedElementSnapshot {
  dyadId: string;
  tagName: string;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  styles: SelectedElementStyles;
}

const DEVICE_DIMENSIONS = {
  desktop: { width: 1260, height: 860, label: "Desktop" },
  tablet: { width: 834, height: 1112, label: "Tablet" },
  mobile: { width: 390, height: 844, label: "Mobile" },
} as const;

const ZOOM_OPTIONS = [40, 60, 80, 100];
const MINIMAP_SIZE = {
  width: 184,
  height: 132,
  padding: 12,
} as const;
const DEFAULT_VIEWPORT = {
  panX: 0,
  panY: 0,
  zoom: 0.4,
  minZoom: 0.2,
  maxZoom: 2,
} as const;

const DISPLAY_OPTIONS = [
  { label: "Block", value: "block" },
  { label: "Flex", value: "flex" },
  { label: "Grid", value: "grid" },
  { label: "Inline Block", value: "inline-block" },
  { label: "None", value: "none" },
];

const JUSTIFY_OPTIONS = [
  { label: "Normal", value: "" },
  { label: "Start", value: "flex-start" },
  { label: "Center", value: "center" },
  { label: "End", value: "flex-end" },
  { label: "Space Between", value: "space-between" },
  { label: "Space Around", value: "space-around" },
];

const ALIGN_OPTIONS = [
  { label: "Normal", value: "" },
  { label: "Start", value: "flex-start" },
  { label: "Center", value: "center" },
  { label: "End", value: "flex-end" },
  { label: "Stretch", value: "stretch" },
];

const TEXT_ALIGN_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
  { label: "Justify", value: "justify" },
];

const FONT_WEIGHT_OPTIONS = [
  { label: "Default", value: "" },
  { label: "300", value: "300" },
  { label: "400", value: "400" },
  { label: "500", value: "500" },
  { label: "600", value: "600" },
  { label: "700", value: "700" },
  { label: "800", value: "800" },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toEditableColor(value: string, fallback = "#000000"): string {
  if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") {
    return fallback;
  }

  return rgbToHex(value) || fallback;
}

function toEditableLengthValue(value: string): string {
  if (!value || value === "normal" || value === "auto") {
    return "";
  }

  const match = value.match(/^-?\d+(\.\d+)?/);
  return match ? match[0] : "";
}

function getUniformAxisValue(first: string, second: string): string {
  if (!first || !second || first !== second) {
    return "";
  }

  return toEditableLengthValue(first);
}

function computeWorldBounds(
  nodes: CanvasNode[],
  padding = 240,
): CanvasWorldBounds {
  if (nodes.length === 0) {
    return {
      minX: -padding,
      minY: -padding,
      maxX: padding,
      maxY: padding,
      width: padding * 2,
      height: padding * 2,
    };
  }

  const minX = Math.min(...nodes.map((node) => node.x)) - padding;
  const minY = Math.min(...nodes.map((node) => node.y)) - padding;
  const maxX = Math.max(...nodes.map((node) => node.x + node.width)) + padding;
  const maxY = Math.max(...nodes.map((node) => node.y + node.height)) + padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function buildMinimapViewModel({
  nodes,
  viewport,
  viewportWidth,
  viewportHeight,
}: {
  nodes: CanvasNode[];
  viewport: typeof DEFAULT_VIEWPORT;
  viewportWidth: number;
  viewportHeight: number;
}): CanvasMinimapViewModel {
  const nodeBounds = computeWorldBounds(nodes);
  const visibleWorldLeft = (0 - viewport.panX) / viewport.zoom;
  const visibleWorldTop = (0 - viewport.panY) / viewport.zoom;
  const visibleWorldWidth = viewportWidth / viewport.zoom;
  const visibleWorldHeight = viewportHeight / viewport.zoom;
  const visibleWorldRight = visibleWorldLeft + visibleWorldWidth;
  const visibleWorldBottom = visibleWorldTop + visibleWorldHeight;

  const bounds = {
    minX: Math.min(nodeBounds.minX, visibleWorldLeft),
    minY: Math.min(nodeBounds.minY, visibleWorldTop),
    maxX: Math.max(nodeBounds.maxX, visibleWorldRight),
    maxY: Math.max(nodeBounds.maxY, visibleWorldBottom),
    width: Math.max(
      1,
      Math.max(nodeBounds.maxX, visibleWorldRight) -
      Math.min(nodeBounds.minX, visibleWorldLeft),
    ),
    height: Math.max(
      1,
      Math.max(nodeBounds.maxY, visibleWorldBottom) -
      Math.min(nodeBounds.minY, visibleWorldTop),
    ),
  };
  const innerWidth = Math.max(1, MINIMAP_SIZE.width - MINIMAP_SIZE.padding * 2);
  const innerHeight = Math.max(
    1,
    MINIMAP_SIZE.height - MINIMAP_SIZE.padding * 2,
  );
  const scale = Math.min(
    innerWidth / bounds.width,
    innerHeight / bounds.height,
  );

  const items = nodes.map((node) => ({
    id: node.id,
    kind: node.type,
    x: (node.x - bounds.minX) * scale + MINIMAP_SIZE.padding,
    y: (node.y - bounds.minY) * scale + MINIMAP_SIZE.padding,
    width: Math.max(8, node.width * scale),
    height: Math.max(8, node.height * scale),
    color: node.type === "design-draft" ? "#c7a8f1" : "#e5d9c8",
    selected: node.selected,
  }));

  const viewportRectWidth = Math.min(
    innerWidth,
    Math.max(18, visibleWorldWidth * scale),
  );
  const viewportRectHeight = Math.min(
    innerHeight,
    Math.max(18, visibleWorldHeight * scale),
  );

  return {
    bounds,
    scale,
    items,
    viewportRect: {
      x: clamp(
        (visibleWorldLeft - bounds.minX) * scale + MINIMAP_SIZE.padding,
        MINIMAP_SIZE.padding,
        MINIMAP_SIZE.width - MINIMAP_SIZE.padding - viewportRectWidth,
      ),
      y: clamp(
        (visibleWorldTop - bounds.minY) * scale + MINIMAP_SIZE.padding,
        MINIMAP_SIZE.padding,
        MINIMAP_SIZE.height - MINIMAP_SIZE.padding - viewportRectHeight,
      ),
      width: viewportRectWidth,
      height: viewportRectHeight,
    },
  };
}

function injectDesignRuntime(html: string): string {
  const runtimeStyle = `
<style data-dyad-design-runtime>
  html, body {
    min-height: 100%;
  }

  body[data-dyad-design-edit-mode="true"] {
    cursor: default;
  }

  [data-dyad-selected="true"] {
    outline: 2px solid #2563eb !important;
    outline-offset: 2px !important;
  }

  [data-dyad-dragging="true"] {
    opacity: 0.7;
    cursor: grabbing !important;
    z-index: 9999;
  }

  [data-dyad-selected="true"][data-dyad-dragging="true"] {
    box-shadow: 0 8px 32px rgba(37, 99, 235, 0.3) !important;
  }

  [data-dyad-drop-indicator] {
    position: absolute;
    background: rgba(59, 130, 246, 0.15);
    border: 2px dashed #3b82f6;
    border-radius: 4px;
    pointer-events: none;
    z-index: 10000;
    transition: all 0.1s ease;
  }

  [data-dyad-drop-indicator="invalid"] {
    background: rgba(239, 68, 68, 0.15);
    border-color: #ef4444;
  }

  [data-dyad-ghost] {
    position: fixed;
    pointer-events: none;
    z-index: 10001;
    opacity: 0.85;
    background: white;
    border: 2px solid #2563eb;
    border-radius: 8px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    padding: 8px 12px;
    font-size: 12px;
    color: #1e40af;
    white-space: nowrap;
  }
</style>`;

  const runtimeScript = `
<script data-dyad-design-runtime>
(() => {
  const ELEMENT_SELECTOR = 'body *';
  let selectedId = null;
  let editMode = false;
  let dragSession = null;
  let dropIndicator = null;
  let ghostElement = null;

  const INVALID_CONTAINER_TAGS = ['html', 'body', 'head', 'script', 'style', 'link', 'meta', 'svg', 'defs'];

  const shouldTrack = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    const tag = element.tagName.toLowerCase();
    return !INVALID_CONTAINER_TAGS.includes(tag);
  };

  const findTrackableParent = (element) => {
    if (!element || !element instanceof HTMLElement) return null;
    if (shouldTrack(element) && element.dataset.dyadId) return element;
    if (element === document.body || element === document.documentElement) return null;
    return findTrackableParent(element.parentElement);
  };

  const getElementPath = (element) => {
    const path = [];
    let current = element;
    while (current && current !== document.body) {
      if (current.dataset.dyadId) {
        path.unshift(current.dataset.dyadId);
      }
      current = current.parentElement;
    }
    return path;
  };

  const getElementLayoutMode = (element) => {
    const style = window.getComputedStyle(element);
    if (style.position === 'absolute' || style.position === 'fixed') return 'absolute';
    if (style.display === 'grid') return 'grid';
    if (style.display === 'flex') return style.flexDirection === 'row' ? 'flex-row' : 'flex-col';
    return 'block-flow';
  };

  const getChildrenForDrop = (container) => {
    return [...container.children].filter(c =>
      c.dataset.dyadId &&
      c.dataset.dyadId !== dragSession?.dyadId &&
      !c.dataset.dyadDesignRuntime &&
      !c.hasAttribute('data-dyad-drop-indicator') &&
      !c.hasAttribute('data-dyad-ghost')
    );
  };

  const calculateDropIndex = (container, pointerX, pointerY) => {
    const children = getChildrenForDrop(container);
    if (children.length === 0) return 0;

    const layoutMode = getElementLayoutMode(container);

    if (layoutMode === 'absolute') {
      return children.length;
    }

    if (layoutMode === 'flex-row' || layoutMode === 'grid') {
      let closestIndex = children.length;
      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        if (pointerX < midX) {
          closestIndex = i;
          break;
        }
      }
      return closestIndex;
    }

    let insertIndex = children.length;
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (pointerY < rect.top + rect.height / 2) {
        insertIndex = i;
        break;
      }
    }
    return insertIndex;
  };

  const isValidDropTarget = (targetEl, draggedEl) => {
    if (!targetEl || !targetEl instanceof HTMLElement) return false;
    if (targetEl === draggedEl) return false;
    if (draggedEl && draggedEl.contains(targetEl)) return false;

    const tag = targetEl.tagName.toLowerCase();
    if (INVALID_CONTAINER_TAGS.includes(tag)) return false;

    const layoutMode = getElementLayoutMode(targetEl);
    if (layoutMode === 'absolute') return true;

    return true;
  };

  const findValidDropTarget = (pointerX, pointerY, excludeEl) => {
    const el = document.elementFromPoint(pointerX, pointerY);
    if (!el || !el instanceof HTMLElement) return null;
    if (el === excludeEl || (excludeEl && excludeEl.contains(el))) return null;

    let container = el.closest('[data-dyad-id]');
    if (!container) {
      if (el.dataset.dyadId) {
        container = el;
      } else {
        container = el.parentElement?.closest('[data-dyad-id]');
      }
    }

    if (!container) return null;

    while (container && !isValidDropTarget(container, excludeEl)) {
      container = container.parentElement?.closest('[data-dyad-id]');
    }

    return container;
  };

  const updateDropIndicator = (container, index) => {
    if (!container) {
      if (dropIndicator) {
        dropIndicator.remove();
        dropIndicator = null;
      }
      return;
    }

    const children = getChildrenForDrop(container);
    const rect = container.getBoundingClientRect();

    if (!dropIndicator) {
      dropIndicator = document.createElement('div');
      dropIndicator.setAttribute('data-dyad-drop-indicator', 'true');
      container.appendChild(dropIndicator);
    }

    dropIndicator.style.left = rect.left + 'px';
    dropIndicator.style.top = rect.top + 'px';
    dropIndicator.style.width = rect.width + 'px';
    dropIndicator.style.height = rect.height + 'px';

    let insertTop;
    if (index === 0 || children.length === 0) {
      insertTop = 0;
    } else if (index >= children.length) {
      const lastChild = children[children.length - 1];
      const lastRect = lastChild.getBoundingClientRect();
      insertTop = lastRect.bottom - rect.top;
    } else {
      const targetChild = children[index - 1];
      const targetRect = targetChild.getBoundingClientRect();
      insertTop = targetRect.bottom - rect.top;
    }

    dropIndicator.style.height = '4px';
    dropIndicator.style.top = (rect.top + insertTop) + 'px';
    dropIndicator.style.left = rect.left + 'px';
    dropIndicator.style.width = rect.width + 'px';
  };

  const removeDropIndicator = () => {
    if (dropIndicator) {
      dropIndicator.remove();
      dropIndicator = null;
    }
  };

  const createGhostElement = (element) => {
    if (ghostElement) ghostElement.remove();

    const rect = element.getBoundingClientRect();
    ghostElement = document.createElement('div');
    ghostElement.setAttribute('data-dyad-ghost', 'true');
    ghostElement.textContent = element.tagName.toLowerCase();

    const style = window.getComputedStyle(element);
    ghostElement.style.width = rect.width + 'px';
    ghostElement.style.height = rect.height + 'px';

    document.body.appendChild(ghostElement);
    return ghostElement;
  };

  const updateGhostPosition = (x, y) => {
    if (ghostElement) {
      ghostElement.style.left = x + 'px';
      ghostElement.style.top = y + 'px';
    }
  };

  const removeGhostElement = () => {
    if (ghostElement) {
      ghostElement.remove();
      ghostElement = null;
    }
  };

  const toCssPropertyName = (property) =>
    property.replace(/[A-Z]/g, (character) => '-' + character.toLowerCase());

  const ensureIds = () => {
    let index = 0;
    document.querySelectorAll(ELEMENT_SELECTOR).forEach((element) => {
      if (!shouldTrack(element)) return;
      if (!element.dataset.dyadId) {
        element.dataset.dyadId = 'dyad-el-' + index;
      }
      index += 1;
    });
  };

  const postHeight = () => {
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
    );
    parent.postMessage({ type: 'dyad-design:content-height', height }, '*');
  };

  const currentSelectedElement = () =>
    selectedId
      ? document.querySelector('[data-dyad-id="' + selectedId + '"]')
      : null;

  const snapshotElement = (element) => {
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);

    return {
      dyadId: element.dataset.dyadId || '',
      tagName: element.tagName.toLowerCase(),
      text: (element.innerText || element.textContent || '').trim().slice(0, 120),
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      styles: {
        color: styles.color,
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        borderRadius: styles.borderRadius,
        borderWidth: styles.borderWidth,
        display: styles.display,
        justifyContent: styles.justifyContent,
        alignItems: styles.alignItems,
        padding: styles.padding,
        paddingTop: styles.paddingTop,
        paddingRight: styles.paddingRight,
        paddingBottom: styles.paddingBottom,
        paddingLeft: styles.paddingLeft,
        margin: styles.margin,
        marginTop: styles.marginTop,
        marginRight: styles.marginRight,
        marginBottom: styles.marginBottom,
        marginLeft: styles.marginLeft,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        fontFamily: styles.fontFamily,
        lineHeight: styles.lineHeight,
        textAlign: styles.textAlign,
        position: styles.position,
      },
    };
  };

  const clearSelection = () => {
    const current = document.querySelector("[data-dyad-selected='true']");
    if (current instanceof HTMLElement) {
      current.removeAttribute('data-dyad-selected');
    }
    selectedId = null;
  };

  const selectElement = (element) => {
    if (!(element instanceof HTMLElement) || !shouldTrack(element)) return;
    ensureIds();
    clearSelection();
    selectedId = element.dataset.dyadId || null;
    element.setAttribute('data-dyad-selected', 'true');

    parent.postMessage(
      {
        type: 'dyad-design:selected',
        payload: snapshotElement(element),
      },
      '*',
    );
  };

  // Drag session management
  const DRAG_THRESHOLD = 5;
  let dragStartX = 0;
  let dragStartY = 0;

  const startElementDrag = (dyadId, pointerX, pointerY, immediate = false) => {
    const el = document.querySelector('[data-dyad-id="' + dyadId + '"]');
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const isAbsolute = style.position === 'absolute' || style.position === 'fixed';

    dragStartX = pointerX;
    dragStartY = pointerY;

    dragSession = {
      dyadId,
      element: el,
      offsetX: pointerX - rect.left,
      offsetY: pointerY - rect.top,
      originalParent: el.parentElement,
      originalIndex: [...el.parentElement.children].indexOf(el),
      originalParentPath: getElementPath(el.parentElement),
      isAbsolute,
      lastPointerX: pointerX,
      lastPointerY: pointerY,
      started: true,
      moved: false,
    };

    if (immediate) {
      createGhostElement(el);
      el.setAttribute('data-dyad-dragging', 'true');
      el.style.opacity = '0.3';
    }

    parent.postMessage({ type: 'dyad-design:drag-started', dyadId }, '*');
  };

  const isInDragHandle = (element, x, y) => {
    const rect = element.getBoundingClientRect();
    const handleSize = 20;
    const isNearEdge = (
      x < rect.left + handleSize ||
      x > rect.right - handleSize ||
      y < rect.top + handleSize ||
      y > rect.bottom - handleSize
    );
    return isNearEdge;
  };

  const updateElementDrag = (pointerX, pointerY) => {
    if (!dragSession || !dragSession.started) return;

    const { element, isAbsolute, offsetX, offsetY } = dragSession;
    dragSession.lastPointerX = pointerX;
    dragSession.lastPointerY = pointerY;

    const dx = pointerX - dragStartX;
    const dy = pointerY - dragStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (!dragSession.moved && distance < DRAG_THRESHOLD) {
      return;
    }

    dragSession.moved = true;

    if (!element.hasAttribute('data-dyad-dragging')) {
      createGhostElement(element);
      element.setAttribute('data-dyad-dragging', 'true');
      element.style.opacity = '0.3';
    }

    if (ghostElement) {
      updateGhostPosition(pointerX - 20, pointerY - 10);
    }

    if (isAbsolute) {
      const rect = element.getBoundingClientRect();
      const containerRect = element.parentElement.getBoundingClientRect();
      const newLeft = pointerX - offsetX - containerRect.left;
      const newTop = pointerY - offsetY - containerRect.top;
      element.style.left = newLeft + 'px';
      element.style.top = newTop + 'px';
    } else {
      const dropTarget = findValidDropTarget(pointerX, pointerY, element);
      if (dropTarget) {
        const insertIndex = calculateDropIndex(dropTarget, pointerX, pointerY);
        updateDropIndicator(dropTarget, insertIndex);
        dragSession.candidateParent = dropTarget;
        dragSession.candidateIndex = insertIndex;
      } else {
        removeDropIndicator();
        dragSession.candidateParent = null;
        dragSession.candidateIndex = null;
      }
    }
  };

  const endElementDrag = () => {
    if (!dragSession || !dragSession.started) return;

    const { element, isAbsolute, originalParent, originalIndex, candidateParent, candidateIndex, moved } = dragSession;

    removeDropIndicator();
    removeGhostElement();
    element.removeAttribute('data-dyad-dragging');
    element.style.opacity = '1';

    let relocated = false;

    // Only relocate if element actually moved beyond threshold
    if (moved) {
      if (isAbsolute) {
        relocated = true;
      } else if (candidateParent && candidateIndex !== null) {
        const children = getChildrenForDrop(candidateParent);

        if (element.parentElement !== candidateParent || 
            [...element.parentElement.children].indexOf(element) !== candidateIndex) {
          if (candidateIndex === 0) {
            candidateParent.insertBefore(element, children[0] || null);
          } else if (candidateIndex >= children.length) {
            candidateParent.appendChild(element);
          } else {
            const insertBeforeEl = children[candidateIndex];
            if (insertBeforeEl && insertBeforeEl !== element) {
              candidateParent.insertBefore(element, insertBeforeEl);
            } else {
              const nextEl = children[candidateIndex + 1];
              if (nextEl) {
                candidateParent.insertBefore(element, nextEl);
              } else {
                candidateParent.appendChild(element);
              }
            }
          }
          relocated = true;
        }
      }
    }

    if (relocated) {
      sendSerializedHtml();
      parent.postMessage({ type: 'dyad-design:drag-ended', relocated: true }, '*');
      // Re-select the element at its new position so user can edit properties immediately
      if (element.dataset.dyadId) {
        selectElement(element);
      }
    } else {
      parent.postMessage({ type: 'dyad-design:drag-ended', relocated: false }, '*');
    }

    dragSession = null;
  };

  const serializeDocument = () => {
    const parser = new DOMParser();
    const documentClone = parser.parseFromString(
      document.documentElement.outerHTML,
      'text/html',
    );

    documentClone
      .querySelectorAll('style[data-dyad-design-runtime], script[data-dyad-design-runtime]')
      .forEach((element) => element.remove());
    documentClone.querySelectorAll('[data-dyad-selected]').forEach((element) => {
      element.removeAttribute('data-dyad-selected');
    });
    documentClone.querySelectorAll('[data-dyad-id]').forEach((element) => {
      element.removeAttribute('data-dyad-id');
    });
    if (documentClone.body) {
      documentClone.body.removeAttribute('data-dyad-design-edit-mode');
    }

    return '<!DOCTYPE html>\\n' + documentClone.documentElement.outerHTML;
  };

  const sendSerializedHtml = (requestId) => {
    parent.postMessage(
      {
        type: 'dyad-design:serialized-html',
        requestId,
        html: serializeDocument(),
      },
      '*',
    );
  };

  const restoreHtml = (html) => {
    const parser = new DOMParser();
    const parsedDocument = parser.parseFromString(html, 'text/html');
    const runtimeStyleElement = document.querySelector('style[data-dyad-design-runtime]');
    const runtimeScriptElement = document.querySelector('script[data-dyad-design-runtime]');

    document.head.innerHTML = parsedDocument.head ? parsedDocument.head.innerHTML : '';
    document.body.innerHTML = parsedDocument.body ? parsedDocument.body.innerHTML : '';

    if (runtimeStyleElement) {
      document.head.appendChild(runtimeStyleElement);
    }
    if (runtimeScriptElement) {
      document.head.appendChild(runtimeScriptElement);
    }

    if (editMode) {
      document.body.dataset.dyadDesignEditMode = 'true';
    }

    selectedId = null;
    ensureIds();
    postHeight();
    sendSerializedHtml();
  };

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data.type !== 'string') return;

    if (data.type === 'dyad-design:set-edit-mode') {
      editMode = !!data.enabled;
      document.body.dataset.dyadDesignEditMode = editMode ? 'true' : 'false';
      return;
    }

    if (data.type === 'dyad-design:clear-selection') {
      clearSelection();
      return;
    }

    if (data.type === 'dyad-design:apply-style') {
      const target =
        (typeof data.dyadId === 'string' &&
          document.querySelector('[data-dyad-id="' + data.dyadId + '"]')) ||
        currentSelectedElement();

      if (!(target instanceof HTMLElement)) {
        parent.postMessage(
          {
            type: 'dyad-design:style-applied',
            success: false,
            error: 'Selected element not found',
          },
          '*',
        );
        return;
      }

      Object.entries(data.styles || {}).forEach(([property, value]) => {
        const cssProperty = toCssPropertyName(property);
        if (typeof value !== 'string' || value.length === 0) {
          target.style.removeProperty(cssProperty);
        } else {
          target.style.setProperty(cssProperty, value);
        }
      });

      if (target.dataset.dyadId) {
        selectElement(target);
      }
      postHeight();
      parent.postMessage(
        {
          type: 'dyad-design:style-applied',
          success: true,
          dyadId: target.dataset.dyadId || null,
        },
        '*',
      );
      sendSerializedHtml();
      return;
    }

    if (data.type === 'dyad-design:remove-element') {
      const target =
        (typeof data.dyadId === 'string' &&
          document.querySelector('[data-dyad-id="' + data.dyadId + '"]')) ||
        currentSelectedElement();

      if (!(target instanceof HTMLElement)) {
        parent.postMessage(
          {
            type: 'dyad-design:element-removed',
            success: false,
            error: 'Selected element not found',
          },
          '*',
        );
        return;
      }

      if (!target.parentElement) {
        parent.postMessage(
          {
            type: 'dyad-design:element-removed',
            success: false,
            error: 'Element cannot be removed',
          },
          '*',
        );
        return;
      }

      const removedDyadId = target.dataset.dyadId || null;
      clearSelection();
      target.remove();
      ensureIds();
      postHeight();
      parent.postMessage(
        {
          type: 'dyad-design:element-removed',
          success: true,
          dyadId: removedDyadId,
        },
        '*',
      );
      sendSerializedHtml();
      return;
    }

    if (data.type === 'dyad-design:get-serialized-html') {
      sendSerializedHtml(data.requestId);
      return;
    }

    if (data.type === 'dyad-design:reset-to-html' && typeof data.html === 'string') {
      clearSelection();
      restoreHtml(data.html);
    }
  });

  document.addEventListener(
    'click',
    (event) => {
      if (!editMode) return;
      if (dragSession) return; // Don't select during drag
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!shouldTrack(target)) return;
      event.preventDefault();
      event.stopPropagation();
      selectElement(target);
    },
    true,
  );

  // Drag event listeners
  document.addEventListener('pointermove', (e) => {
    if (dragSession && dragSession.started) {
      e.preventDefault();
      updateElementDrag(e.clientX, e.clientY);
    }
  }, { passive: false });

  document.addEventListener('pointerup', (e) => {
    if (dragSession && dragSession.started) {
      e.preventDefault();
      endElementDrag();
    }
  });

  // In select mode, clicking on any element starts selection
  // Drag only starts after mouse moves beyond threshold
  document.addEventListener('pointerdown', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    if (editMode && shouldTrack(target)) {
      const trackableEl = findTrackableParent(target);
      if (trackableEl) {
        ensureIds();
        const dyadId = trackableEl.dataset.dyadId;
        if (dyadId) {
          e.preventDefault();
          e.stopPropagation();

          // Only select, don't start drag immediately
          selectElement(trackableEl);

          // Initialize drag session but don't start yet
          startElementDrag(dyadId, e.clientX, e.clientY, false);
        }
      }
    }
  }, true);

  // Clean up drag session on pointer cancel
  document.addEventListener('pointercancel', () => {
    if (dragSession) {
      removeDropIndicator();
      removeGhostElement();
      if (dragSession.element) {
        dragSession.element.removeAttribute('data-dyad-dragging');
        dragSession.element.style.opacity = '1';
      }
      dragSession = null;
    }
  });

  ensureIds();
  parent.postMessage({ type: 'dyad-design:ready' }, '*');
  postHeight();

  const resizeObserver = new ResizeObserver(() => postHeight());
  resizeObserver.observe(document.documentElement);
  if (document.body) {
    resizeObserver.observe(document.body);
  }

  window.addEventListener('load', postHeight);
})();
</script>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${runtimeStyle}${runtimeScript}</head>`);
  }

  return `${runtimeStyle}${runtimeScript}${html}`;
}

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

function InspectorSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs text-slate-500">
        {label}
      </Label>
      <select
        id={id}
        className="mt-1 h-9 w-full rounded-md border border-[#e8dfd3] bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function LayoutInspector({
  selectedElement,
  onApplyStyles,
}: {
  selectedElement: SelectedElementSnapshot | null;
  onApplyStyles: (styles: Record<string, string>) => void;
}) {
  const styles = selectedElement?.styles;

  return (
    <div className="w-[380px] rounded-[30px] border border-[#ece5da] bg-white/98 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="grid grid-cols-1 gap-4">
        <InspectorSelect
          id="design-display"
          label="Display"
          value={styles?.display ?? "block"}
          onChange={(value) => onApplyStyles({ display: value })}
          options={DISPLAY_OPTIONS}
        />
        <div className="grid grid-cols-2 gap-3">
          <InspectorSelect
            id="design-justify"
            label="Justify"
            value={
              styles?.justifyContent === "normal"
                ? ""
                : (styles?.justifyContent ?? "")
            }
            onChange={(value) => onApplyStyles({ justifyContent: value })}
            options={JUSTIFY_OPTIONS}
          />
          <InspectorSelect
            id="design-align"
            label="Align"
            value={
              styles?.alignItems === "normal" ? "" : (styles?.alignItems ?? "")
            }
            onChange={(value) => onApplyStyles({ alignItems: value })}
            options={ALIGN_OPTIONS}
          />
        </div>
        <div className="rounded-[24px] border border-[#efe6d9] bg-[#fbfaf7] p-4">
          <div className="mb-3 text-sm font-medium text-slate-800">Padding</div>
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              id="design-padding-x"
              label="Horizontal"
              value={getUniformAxisValue(
                styles?.paddingLeft ?? "",
                styles?.paddingRight ?? "",
              )}
              onChange={(value) =>
                onApplyStyles({
                  paddingLeft: value ? processNumericValue(value) : "",
                  paddingRight: value ? processNumericValue(value) : "",
                })
              }
            />
            <NumberInput
              id="design-padding-y"
              label="Vertical"
              value={getUniformAxisValue(
                styles?.paddingTop ?? "",
                styles?.paddingBottom ?? "",
              )}
              onChange={(value) =>
                onApplyStyles({
                  paddingTop: value ? processNumericValue(value) : "",
                  paddingBottom: value ? processNumericValue(value) : "",
                })
              }
            />
          </div>
        </div>
        <div className="rounded-[24px] border border-[#efe6d9] bg-[#fbfaf7] p-4">
          <div className="mb-3 text-sm font-medium text-slate-800">Margin</div>
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              id="design-margin-x"
              label="Horizontal"
              value={getUniformAxisValue(
                styles?.marginLeft ?? "",
                styles?.marginRight ?? "",
              )}
              onChange={(value) =>
                onApplyStyles({
                  marginLeft: value ? processNumericValue(value) : "",
                  marginRight: value ? processNumericValue(value) : "",
                })
              }
            />
            <NumberInput
              id="design-margin-y"
              label="Vertical"
              value={getUniformAxisValue(
                styles?.marginTop ?? "",
                styles?.marginBottom ?? "",
              )}
              onChange={(value) =>
                onApplyStyles({
                  marginTop: value ? processNumericValue(value) : "",
                  marginBottom: value ? processNumericValue(value) : "",
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StyleInspector({
  selectedElement,
  onApplyStyles,
}: {
  selectedElement: SelectedElementSnapshot | null;
  onApplyStyles: (styles: Record<string, string>) => void;
}) {
  const styles = selectedElement?.styles;

  return (
    <div className="w-[380px] rounded-[30px] border border-[#ece5da] bg-white/98 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="design-text-color" className="text-xs text-slate-500">
            Color
          </Label>
          <ColorPicker
            id="design-text-color"
            value={toEditableColor(styles?.color ?? "", "#111827")}
            onChange={(value) => onApplyStyles({ color: value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label
            htmlFor="design-background-color"
            className="text-xs text-slate-500"
          >
            Background
          </Label>
          <ColorPicker
            id="design-background-color"
            value={toEditableColor(styles?.backgroundColor ?? "", "#ffffff")}
            onChange={(value) => onApplyStyles({ backgroundColor: value })}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            id="design-border-width"
            label="Border"
            value={toEditableLengthValue(styles?.borderWidth ?? "")}
            onChange={(value) =>
              onApplyStyles({
                borderWidth: value ? processNumericValue(value) : "",
              })
            }
          />
          <NumberInput
            id="design-radius"
            label="Radius"
            value={toEditableLengthValue(styles?.borderRadius ?? "")}
            onChange={(value) =>
              onApplyStyles({
                borderRadius: value ? processNumericValue(value) : "",
              })
            }
          />
        </div>
        <div>
          <Label
            htmlFor="design-border-color"
            className="text-xs text-slate-500"
          >
            Border Color
          </Label>
          <ColorPicker
            id="design-border-color"
            value={toEditableColor(styles?.borderColor ?? "", "#111827")}
            onChange={(value) => onApplyStyles({ borderColor: value })}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            id="design-font-size"
            label="Font Size"
            value={toEditableLengthValue(styles?.fontSize ?? "")}
            onChange={(value) =>
              onApplyStyles({
                fontSize: value ? processNumericValue(value) : "",
              })
            }
          />
          <NumberInput
            id="design-line-height"
            label="Line Height"
            value={toEditableLengthValue(styles?.lineHeight ?? "")}
            onChange={(value) =>
              onApplyStyles({
                lineHeight: value ? processNumericValue(value) : "",
              })
            }
          />
        </div>
        <InspectorSelect
          id="design-font-weight"
          label="Font Weight"
          value={styles?.fontWeight ?? ""}
          onChange={(value) => onApplyStyles({ fontWeight: value })}
          options={FONT_WEIGHT_OPTIONS}
        />
        <div>
          <Label
            htmlFor="design-font-family"
            className="text-xs text-slate-500"
          >
            Font Family
          </Label>
          <Input
            id="design-font-family"
            className="mt-1 h-9 border-[#e8dfd3] text-sm"
            value={styles?.fontFamily ?? ""}
            onChange={(event) =>
              onApplyStyles({ fontFamily: event.target.value.trim() })
            }
            placeholder="Inter, sans-serif"
          />
        </div>
        <InspectorSelect
          id="design-text-align"
          label="Text Align"
          value={styles?.textAlign ?? ""}
          onChange={(value) => onApplyStyles({ textAlign: value })}
          options={TEXT_ALIGN_OPTIONS}
        />
      </div>
    </div>
  );
}

export const DesignPanel: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const initializedViewportKeyRef = useRef<string | null>(null);
  const serializedHtmlResolversRef = useRef(
    new Map<string, (html: string | null) => void>(),
  );
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const chatId = useAtomValue(selectedChatIdAtom);
  const [, setPreviewMode] = useAtom(previewModeAtom);
  const [, setIsPreviewOpen] = useAtom(isPreviewOpenAtom);
  const [, setDesignDraftDirty] = useAtom(designDraftDirtyAtom);
  const [designPendingNavigation, setDesignPendingNavigation] = useAtom(
    designPendingNavigationAtom,
  );
  const { appId, data: draft, isLoading, refetch } = useDesignDraft();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<DesignViewMode>("edit");
  const [canvasTool, setCanvasTool] = useState<CanvasTool>("select");
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [inspectorPanel, setInspectorPanel] = useState<InspectorPanel>(null);
  const [selectedElement, setSelectedElement] =
    useState<SelectedElementSnapshot | null>(null);
  const [contentHeight, setContentHeight] = useState(900);
  const [savedHtml, setSavedHtml] = useState<string | null>(null);
  const [originalHtml, setOriginalHtml] = useState<string | null>(null);
  const [pendingSerializedHtml, setPendingSerializedHtml] = useState<
    string | null
  >(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isRuntimeReady, setIsRuntimeReady] = useState(false);
  const [localPendingAction, setLocalPendingAction] =
    useState<PendingAction | null>(null);
  const deviceMode: DeviceMode = draft?.deviceMode ?? "desktop";
  const frameDimensions = DEVICE_DIMENSIONS[deviceMode];
  const nodeHeight = Math.max(contentHeight, frameDimensions.height);
  const isCanvasEditingEnabled =
    viewMode === "edit" &&
    canvasTool === "select" &&
    !isPanning &&
    !isDraggingElement;
  const activePendingAction = localPendingAction ?? designPendingNavigation;
  const canvasNodes = useMemo<CanvasNode[]>(
    () => [
      {
        id: draft?.id ?? "design-draft-node",
        type: "design-draft",
        x: 0,
        y: 0,
        width: frameDimensions.width,
        height: nodeHeight,
        selected: true,
      },
    ],
    [draft?.id, frameDimensions.width, nodeHeight],
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
    setSelectedElement(null);
    setInspectorPanel(null);
    setSavedHtml(null);
    setPendingSerializedHtml(null);
    setIsDirty(false);
    setIsRuntimeReady(false);
    setLocalPendingAction(null);
  }, [draft?.id]);

  useEffect(() => {
    setDesignDraftDirty(isDirty);
  }, [isDirty, setDesignDraftDirty]);

  useEffect(() => {
    return () => {
      serializedHtmlResolversRef.current.forEach((resolve) => resolve(null));
      serializedHtmlResolversRef.current.clear();
      setDesignDraftDirty(false);
      setDesignPendingNavigation(null);
    };
  }, [setDesignDraftDirty, setDesignPendingNavigation]);

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
    if (!draft || viewportSize.width === 0 || viewportSize.height === 0) return;

    const viewportKey = `${draft.id}:${deviceMode}`;
    if (initializedViewportKeyRef.current === viewportKey) return;

    initializedViewportKeyRef.current = viewportKey;
    setViewport((current) => ({
      ...current,
      panX: (viewportSize.width - frameDimensions.width * current.zoom) / 2,
      panY: Math.max(96, (viewportSize.height - nodeHeight * current.zoom) / 2),
    }));
  }, [
    draft,
    deviceMode,
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
      setSelectedElement(null);
      setInspectorPanel(null);
    }
  }, [draft?.id, isCanvasEditingEnabled]);

  const requestSerializedHtml = useCallback(() => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) {
      return Promise.resolve<string | null>(null);
    }

    const requestId = `design-html-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data.type !== "string") return;

      if (data.type === "dyad-design:ready") {
        setIsRuntimeReady(true);
        return;
      }

      if (data.type === "dyad-design:selected") {
        setSelectedElement(data.payload as SelectedElementSnapshot);
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
        const normalizedHtml = normalizeDesignDraftHtml(data.html);
        setPendingSerializedHtml(normalizedHtml);
        setIsDirty(
          savedHtml
            ? hasUnsavedDesignChanges(savedHtml, normalizedHtml)
            : false,
        );

        if (typeof data.requestId === "string") {
          const resolver = serializedHtmlResolversRef.current.get(
            data.requestId,
          );
          if (resolver) {
            serializedHtmlResolversRef.current.delete(data.requestId);
            resolver(normalizedHtml);
          }
        }
        return;
      }

      if (data.type === "dyad-design:element-removed") {
        if (data.success) {
          setSelectedElement(null);
          setInspectorPanel(null);
          return;
        }

        if (typeof data.error === "string") {
          showError(data.error);
        }
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
        return;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [savedHtml, requestSerializedHtml]);

  const srcDoc = useMemo(() => {
    if (!draft?.html) return "";
    return injectDesignRuntime(draft.html);
  }, [draft?.html]);

  // Store original HTML when draft loads (for Reset functionality)
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
      await refetch();
    },
    [appId, draft, refetch],
  );

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

  const updateZoomFromPreset = (nextZoomPercent: number) => {
    const anchor = {
      x: viewportSize.width / 2,
      y: viewportSize.height / 2,
    };
    zoomAtPoint(nextZoomPercent / 100, anchor);
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

  const applyStylesToSelection = (styles: Record<string, string>) => {
    if (!selectedElement || !iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage(
      {
        type: "dyad-design:apply-style",
        dyadId: selectedElement.dyadId,
        styles,
      },
      "*",
    );
  };

  const removeSelectedElement = () => {
    if (!selectedElement || !iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage(
      {
        type: "dyad-design:remove-element",
        dyadId: selectedElement.dyadId,
      },
      "*",
    );
  };

  const resetDraftToSaved = () => {
    // Reset to the original HTML loaded from server (before any edits)
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
    setSaveStatus('idle');
    setSelectedElement(null);
    setInspectorPanel(null);
  };

  const saveDesignChanges = useCallback(async () => {
    if (!draft || !appId) return false;

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
      setSaveStatus('error');
      return false;
    }
  }, [draft, appId, pendingSerializedHtml, requestSerializedHtml, queryClient, chatId]);

  // Auto-save when changes are detected (debounced 800ms)
  useEffect(() => {
    if (!isDirty || !draft || !appId) return;

    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const success = await saveDesignChanges();
        if (success) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('error');
        }
      } catch {
        setSaveStatus('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [isDirty, draft, appId, saveDesignChanges]);

  const clearPendingAction = () => {
    setLocalPendingAction(null);
    setDesignPendingNavigation(null);
  };

  const performPendingAction = useCallback(
    async (action: PendingAction | null) => {
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
          await updateDeviceMode(action.deviceMode);
          break;
      }
    },
    [setPreviewMode, setIsPreviewOpen, updateDeviceMode],
  );

  const handleSaveAndContinue = async () => {
    const action = activePendingAction;
    const didSave = await saveDesignChanges();
    if (!didSave) return;
    clearPendingAction();
    await performPendingAction(action);
  };

  const handleDiscardAndContinue = async () => {
    const action = activePendingAction;
    resetDraftToSaved();
    clearPendingAction();
    await performPendingAction(action);
  };

  const requestViewModeChange = (nextMode: DesignViewMode) => {
    if (nextMode === viewMode) return;
    if (isDirty && nextMode === "view") {
      setLocalPendingAction({ type: "set-view-mode", mode: nextMode });
      return;
    }

    setViewMode(nextMode);
  };

  const requestCanvasToolChange = (nextTool: CanvasTool) => {
    if (nextTool === canvasTool) return;
    if (isDirty && nextTool === "hand") {
      setLocalPendingAction({ type: "set-canvas-tool", tool: nextTool });
      return;
    }

    setCanvasTool(nextTool);
  };

  const requestDeviceModeChange = (nextDeviceMode: DeviceMode) => {
    if (nextDeviceMode === deviceMode) return;
    if (isDirty) {
      setLocalPendingAction({
        type: "set-device-mode",
        deviceMode: nextDeviceMode,
      });
      return;
    }

    void updateDeviceMode(nextDeviceMode);
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

        <div className="absolute left-6 top-4 z-20 flex items-center gap-3 rounded-[20px] border border-white/70 bg-white/95 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur">
          <div className="flex h-8 w-8 items-center justify-center rounded-[16px] bg-[#111827] text-white">
            <GripHorizontal className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="max-w-[220px] truncate text-[15px] font-semibold text-slate-900">
              {draft.title}
            </div>
            <div className="text-[10px] text-slate-400">Chat {chatId}</div>
          </div>
          <Layers3 className="h-[18px] w-[18px] text-slate-400" />
        </div>

        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-[14px] border border-white/70 bg-white/95 p-[3px] shadow-[0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => requestViewModeChange("view")}
              className={cn(
                "flex h-8 items-center gap-1 rounded-[10px] px-3 text-[11px] font-medium transition-colors",
                viewMode === "view"
                  ? "bg-[#f3efe8] text-slate-900"
                  : "text-slate-500 hover:bg-[#f7f4ef]",
              )}
            >
              <Eye className="h-3 w-3" />
              View
            </button>
            <button
              type="button"
              onClick={() => requestViewModeChange("edit")}
              className={cn(
                "flex h-8 items-center gap-1 rounded-[10px] px-3 text-[11px] font-medium transition-colors",
                viewMode === "edit"
                  ? "bg-[#f3efe8] text-slate-900"
                  : "text-slate-500 hover:bg-[#f7f4ef]",
              )}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </div>
        </div>

        <div className="absolute right-6 top-4 z-20 flex items-center gap-1.5 rounded-[20px] border border-white/70 bg-white/95 px-2.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur">
          <button className="rounded-[14px] p-2 text-slate-500 hover:bg-[#f7f4ef]">
            <Expand className="h-4 w-4" />
          </button>
          <div className="min-w-[44px] text-center text-[14px] font-semibold text-slate-600">
            {Math.round(viewport.zoom * 100)}%
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
                  requestCanvasToolChange(key as CanvasTool);
                }
              }}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-[16px] text-slate-500 transition-colors hover:bg-[#f7f4ef]",
                canvasTool === key && "bg-[#f3efe8] text-slate-900",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>

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
                title={`Design draft ${draft.title}`}
                sandbox="allow-same-origin allow-scripts"
                className={cn(
                  "relative h-full w-full rounded-[18px] border-0 bg-white",
                  canvasTool === "hand" && "pointer-events-none",
                )}
                srcDoc={srcDoc}
              />
              {canvasTool === "hand" && (
                <div className="absolute inset-0 rounded-[18px] bg-transparent" />
              )}
            </div>
          </div>
        </div>

        {viewMode === "edit" && (
          <>
            <div className="absolute left-1/2 top-[80px] z-20 -translate-x-1/2 rounded-[18px] border border-white/70 bg-white/95 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.07)] backdrop-blur">
              <div className="flex items-center gap-0.5 px-1">
                {[
                  {
                    key: "pin",
                    icon: Pin,
                    onClick: () => setInspectorPanel(null),
                  },
                  {
                    key: "layers",
                    icon: Layers3,
                    onClick: () => setInspectorPanel(null),
                    dividerAfter: true,
                  },
                  {
                    key: "layout",
                    icon: MoveHorizontal,
                    onClick: () =>
                      setInspectorPanel((prev) =>
                        prev === "layout" ? null : "layout",
                      ),
                    dividerAfter: true,
                  },
                  {
                    key: "styles",
                    icon: Palette,
                    onClick: () =>
                      setInspectorPanel((prev) =>
                        prev === "styles" ? null : "styles",
                      ),
                    dividerAfter: true,
                  },
                  {
                    key: "delete",
                    icon: Trash2,
                    onClick: selectedElement ? removeSelectedElement : undefined,
                    disabled: !selectedElement,
                  },
                  {
                    key: "more",
                    icon: MoreHorizontal,
                    onClick: () => setInspectorPanel(null),
                  },
                ].map(({ key, icon: Icon, onClick, dividerAfter, disabled }) => (
                  <React.Fragment key={key}>
                    <button
                      type="button"
                      onClick={onClick}
                      disabled={disabled}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-[12px] transition-colors hover:bg-[#f7f4ef]",
                        inspectorPanel === key
                          ? "bg-[#f3efe8] text-slate-900"
                          : disabled
                            ? "text-slate-300 cursor-not-allowed"
                            : "text-slate-500",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                    {dividerAfter ? (
                      <div className="mx-1 h-5 w-px rounded-full bg-[#ece6dd]" />
                    ) : null}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {inspectorPanel && (
              <div className="absolute left-1/2 top-[132px] z-20 -translate-x-1/2">
                {inspectorPanel === "layout" && (
                  <LayoutInspector
                    selectedElement={selectedElement}
                    onApplyStyles={applyStylesToSelection}
                  />
                )}
                {inspectorPanel === "styles" && (
                  <StyleInspector
                    selectedElement={selectedElement}
                    onApplyStyles={applyStylesToSelection}
                  />
                )}
              </div>
            )}

            {selectedElement && (
              <div className="absolute bottom-8 right-8 z-20 rounded-[20px] border border-white/70 bg-white/96 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <div className="text-[13px] font-medium text-slate-900">
                  {selectedElement.tagName}
                </div>
                <div className="max-w-[220px] truncate text-[11px] text-slate-500">
                  {selectedElement.text || "Selected element"}
                </div>
              </div>
            )}
          </>
        )}

        {viewMode === "edit" && (
          <div className="absolute bottom-[72px] left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/70 bg-white/96 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-blue-600">Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Saved</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">Save failed</span>
                  </>
                )}
                {saveStatus === 'idle' && isDirty && (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span>Editing...</span>
                  </>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetDraftToSaved}
                className="rounded-full"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        )}

        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-[22px] border border-white/70 bg-white/96 px-3 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          {[
            { key: "desktop", icon: Monitor },
            { key: "tablet", icon: Tablet },
            { key: "mobile", icon: Smartphone },
          ].map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => requestDeviceModeChange(key as DeviceMode)}
              className={cn(
                "flex items-center gap-2 rounded-[15px] px-4 py-2 text-[14px] font-medium transition-colors",
                deviceMode === key
                  ? "bg-[#111827] text-white"
                  : "text-slate-500 hover:bg-[#f7f4ef]",
              )}
            >
              <Icon className="h-4 w-4" />
              {DEVICE_DIMENSIONS[key as keyof typeof DEVICE_DIMENSIONS].label}
            </button>
          ))}

          <div className="mx-2 h-7 w-px bg-[#ece5da]" />

          {ZOOM_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => updateZoomFromPreset(value)}
              className={cn(
                "rounded-[14px] px-3 py-2 text-[14px] font-medium transition-colors",
                Math.round(viewport.zoom * 100) === value
                  ? "bg-[#f3efe8] text-slate-900"
                  : "text-slate-500 hover:bg-[#f7f4ef]",
              )}
            >
              {value}%
            </button>
          ))}
        </div>
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
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save and continue"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
