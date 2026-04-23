import { describe, expect, it } from "vitest";
import {
  buildDesignCanvasGraph,
  buildMinimapViewModel,
  computeViewportForBounds,
  computeWorldBounds,
  getUniformAxisValue,
  injectDesignRuntime,
  toEditableColor,
  toEditableLengthValue,
} from "./designCanvasUtils";

describe("designCanvasUtils", () => {
  it("normalizes editable color values", () => {
    expect(toEditableColor("rgb(255, 0, 0)")).toBe("#ff0000");
    expect(toEditableColor("transparent", "#ffffff")).toBe("#ffffff");
  });

  it("extracts numeric length values", () => {
    expect(toEditableLengthValue("12px")).toBe("12");
    expect(toEditableLengthValue("auto")).toBe("");
    expect(getUniformAxisValue("16px", "16px")).toBe("16");
    expect(getUniformAxisValue("16px", "24px")).toBe("");
  });

  it("computes canvas bounds with padding", () => {
    expect(
      computeWorldBounds(
        [
          {
            id: "one",
            type: "root-page",
            x: 10,
            y: 20,
            width: 100,
            height: 50,
          },
        ],
        10,
      ),
    ).toEqual({
      minX: 0,
      minY: 10,
      maxX: 120,
      maxY: 80,
      width: 120,
      height: 70,
    });
  });

  it("builds a minimap view model with viewport rect", () => {
    const model = buildMinimapViewModel({
      nodes: [
        {
          id: "draft",
          type: "root-page",
          x: 0,
          y: 0,
          width: 400,
          height: 300,
          selected: true,
        },
      ],
      viewport: {
        panX: 20,
        panY: 40,
        zoom: 0.5,
        minZoom: 0.2,
        maxZoom: 2,
      },
      viewportWidth: 800,
      viewportHeight: 600,
    });

    expect(model.items).toHaveLength(1);
    expect(model.items[0]?.selected).toBe(true);
    expect(model.viewportRect.width).toBeGreaterThan(0);
    expect(model.viewportRect.height).toBeGreaterThan(0);
  });

  it("builds a flow canvas graph with components above and pages below the root", () => {
    const graph = buildDesignCanvasGraph({
      rootDraft: {
        id: "root-draft",
        appId: 1,
        chatId: 1,
        title: "Root",
        brief: null,
        deviceMode: "desktop",
        html: "<html><body>Root</body></html>",
        flowId: "flow-1",
        createdAt: "2026-04-23T00:00:00.000Z",
        updatedAt: "2026-04-23T00:00:00.000Z",
      },
      flowPages: [
        {
          id: "page-root",
          flowId: "flow-1",
          draftId: "root-draft",
          title: "Home",
          prompt: null,
          role: "root",
          order: 0,
          sourceDraftId: null,
          status: "ready",
          createdAt: "2026-04-23T00:00:00.000Z",
          updatedAt: "2026-04-23T00:00:00.000Z",
        },
        {
          id: "page-generated",
          flowId: "flow-1",
          draftId: "generated-draft",
          title: "Pricing",
          prompt: null,
          role: "generated",
          order: 1,
          sourceDraftId: "root-draft",
          status: "ready",
          createdAt: "2026-04-23T00:00:00.000Z",
          updatedAt: "2026-04-23T00:00:00.000Z",
        },
      ],
      draftComponents: [
        {
          id: "component-1",
          appId: 1,
          flowId: "flow-1",
          draftId: "root-draft",
          name: "Header",
          description: "Shared header",
          htmlTemplate: "<header></header>",
          previewHtml: "<header>Header</header>",
          props: [],
          createdAt: "2026-04-23T00:00:00.000Z",
          updatedAt: "2026-04-23T00:00:00.000Z",
        },
      ],
      draftsById: {
        "root-draft": {
          id: "root-draft",
          appId: 1,
          chatId: 1,
          title: "Root",
          brief: null,
          deviceMode: "desktop",
          html: "<html><body>Root</body></html>",
          flowId: "flow-1",
          createdAt: "2026-04-23T00:00:00.000Z",
          updatedAt: "2026-04-23T00:00:00.000Z",
        },
        "generated-draft": {
          id: "generated-draft",
          appId: 1,
          chatId: 1,
          title: "Pricing",
          brief: null,
          deviceMode: "desktop",
          html: "<html><body>Pricing</body></html>",
          flowId: "flow-1",
          createdAt: "2026-04-23T00:00:00.000Z",
          updatedAt: "2026-04-23T00:00:00.000Z",
        },
      },
      activeDraftId: "root-draft",
      activeNodeHeight: 920,
    });

    const root = graph.nodes.find((node) => node.type === "root-page");
    const component = graph.nodes.find(
      (node) => node.type === "draft-component",
    );
    const generated = graph.nodes.find(
      (node) => node.type === "generated-page",
    );

    expect(root).toBeDefined();
    expect(component).toBeDefined();
    expect(generated).toBeDefined();
    expect(component!.y).toBeLessThan(root!.y);
    expect(generated!.y).toBeGreaterThan(root!.y + root!.height);
    expect(graph.edges.some((edge) => edge.type === "component-link")).toBe(
      true,
    );
    expect(graph.edges.some((edge) => edge.type === "flow-link")).toBe(true);
  });

  it("fits the viewport around graph bounds", () => {
    const viewport = computeViewportForBounds({
      bounds: {
        minX: -500,
        minY: -300,
        maxX: 600,
        maxY: 900,
        width: 1100,
        height: 1200,
      },
      viewportWidth: 1600,
      viewportHeight: 900,
    });

    expect(viewport.zoom).toBeGreaterThan(0.2);
    expect(viewport.panX).toBeTypeOf("number");
    expect(viewport.panY).toBeTypeOf("number");
  });

  it("injects the design runtime into the html head", () => {
    const html =
      "<!DOCTYPE html><html><head></head><body><main>Hello</main></body></html>";

    const result = injectDesignRuntime(html);

    expect(result).toContain("data-dyad-design-runtime");
    expect(result).toContain("dyad-design:set-edit-mode");
    expect(result).toContain("</head>");
  });
});
