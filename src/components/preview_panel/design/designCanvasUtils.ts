import { rgbToHex } from "@/utils/style-utils";

export type DesignViewMode = "view" | "edit";
export type InspectorPanel = "layout" | "styles" | null;
export type CanvasTool = "hand" | "select";
export type DeviceMode = "desktop" | "tablet" | "mobile";
export type PreviewMode =
  | "preview"
  | "code"
  | "problems"
  | "configure"
  | "publish"
  | "security"
  | "design";
export type PendingAction =
  | { type: "switch-preview-mode"; mode: PreviewMode }
  | { type: "close-preview" }
  | { type: "set-view-mode"; mode: DesignViewMode }
  | { type: "set-canvas-tool"; tool: CanvasTool }
  | { type: "set-device-mode"; deviceMode: DeviceMode };

export type CanvasNodeType = "design-draft";

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
}

export interface CanvasWorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface MinimapItem {
  id: string;
  kind: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  selected?: boolean;
}

export interface MinimapViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasViewportState {
  panX: number;
  panY: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

export interface CanvasMinimapViewModel {
  bounds: CanvasWorldBounds;
  scale: number;
  items: MinimapItem[];
  viewportRect: MinimapViewportRect;
}

export interface SelectedElementStyles {
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

export interface SelectedElementSnapshot {
  dyadId: string;
  tagName: string;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  styles: SelectedElementStyles;
}

export const DEVICE_DIMENSIONS = {
  desktop: { width: 1260, height: 860, label: "Desktop" },
  tablet: { width: 834, height: 1112, label: "Tablet" },
  mobile: { width: 390, height: 844, label: "Mobile" },
} as const;

export const ZOOM_OPTIONS = [40, 60, 80, 100];
export const MINIMAP_SIZE = {
  width: 184,
  height: 132,
  padding: 12,
} as const;
export const DEFAULT_VIEWPORT: CanvasViewportState = {
  panX: 0,
  panY: 0,
  zoom: 0.4,
  minZoom: 0.2,
  maxZoom: 2,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function toEditableColor(
  value: string,
  fallback = "#000000",
): string {
  if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") {
    return fallback;
  }

  return rgbToHex(value) || fallback;
}

export function toEditableLengthValue(value: string): string {
  if (!value || value === "normal" || value === "auto") {
    return "";
  }

  const match = value.match(/^-?\d+(\.\d+)?/);
  return match ? match[0] : "";
}

export function getUniformAxisValue(first: string, second: string): string {
  if (!first || !second || first !== second) {
    return "";
  }

  return toEditableLengthValue(first);
}

export function computeWorldBounds(
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

export function buildMinimapViewModel({
  nodes,
  viewport,
  viewportWidth,
  viewportHeight,
}: {
  nodes: CanvasNode[];
  viewport: CanvasViewportState;
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
  const scale = Math.min(innerWidth / bounds.width, innerHeight / bounds.height);

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

export function injectDesignRuntime(html: string): string {
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
      originalNextSibling: el.nextSibling,
      originalStyles: {
        position: el.style.position,
        left: el.style.left,
        top: el.style.top,
        width: el.style.width,
        zIndex: el.style.zIndex,
        pointerEvents: el.style.pointerEvents,
      },
      isAbsolute,
      started: immediate,
    };

    if (immediate) {
      el.setAttribute('data-dyad-dragging', 'true');
      createGhostElement(el);
      updateGhostPosition(pointerX + 12, pointerY + 12);
      parent.postMessage({ type: 'dyad-design:drag-started', dyadId }, '*');
    }
  };

  const updateElementDrag = (pointerX, pointerY) => {
    if (!dragSession) return;

    if (!dragSession.started) {
      const distance = Math.sqrt(
        Math.pow(pointerX - dragStartX, 2) + Math.pow(pointerY - dragStartY, 2)
      );

      if (distance < DRAG_THRESHOLD) {
        return;
      }

      dragSession.started = true;
      dragSession.element.setAttribute('data-dyad-dragging', 'true');
      createGhostElement(dragSession.element);
      parent.postMessage({ type: 'dyad-design:drag-started', dyadId: dragSession.dyadId }, '*');
    }

    updateGhostPosition(pointerX + 12, pointerY + 12);

    const dropTarget = findValidDropTarget(pointerX, pointerY, dragSession.element);
    if (!dropTarget) {
      removeDropIndicator();
      dragSession.dropTarget = null;
      dragSession.dropIndex = -1;
      return;
    }

    const dropIndex = calculateDropIndex(dropTarget, pointerX, pointerY);
    dragSession.dropTarget = dropTarget;
    dragSession.dropIndex = dropIndex;
    updateDropIndicator(dropTarget, dropIndex);
  };

  const endElementDrag = () => {
    if (!dragSession) return;

    const { element, dropTarget, dropIndex, originalParent, originalNextSibling } = dragSession;
    const hadStarted = dragSession.started;

    removeDropIndicator();
    removeGhostElement();
    element.removeAttribute('data-dyad-dragging');

    let relocated = false;

    if (hadStarted && dropTarget && dropTarget !== element && !element.contains(dropTarget)) {
      const children = getChildrenForDrop(dropTarget);
      const referenceChild = dropIndex >= 0 && dropIndex < children.length ? children[dropIndex] : null;
      dropTarget.insertBefore(element, referenceChild || null);
      relocated = true;
    }

    if (!relocated && originalParent) {
      originalParent.insertBefore(element, originalNextSibling);
    }

    ensureIds();
    postHeight();
    sendSerializedHtml();
    parent.postMessage({ type: 'dyad-design:drag-ended', relocated }, '*');
    dragSession = null;
  };

  const sendSerializedHtml = (requestId) => {
    parent.postMessage(
      {
        type: 'dyad-design:serialized-html',
        requestId: requestId || null,
        html: '<!DOCTYPE html>\\n' + document.documentElement.outerHTML,
      },
      '*',
    );
  };

  const restoreHtml = (nextHtml) => {
    document.open();
    document.write(nextHtml);
    document.close();

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
      if (dragSession) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!shouldTrack(target)) return;
      event.preventDefault();
      event.stopPropagation();
      selectElement(target);
    },
    true,
  );

  document.addEventListener('pointermove', (e) => {
    if (dragSession) {
      e.preventDefault();
      updateElementDrag(e.clientX, e.clientY);
    }
  }, { passive: false });

  document.addEventListener('pointerup', (e) => {
    if (dragSession) {
      e.preventDefault();
      endElementDrag();
    }
  });

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
          selectElement(trackableEl);
          startElementDrag(dyadId, e.clientX, e.clientY, false);
        }
      }
    }
  }, true);

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
