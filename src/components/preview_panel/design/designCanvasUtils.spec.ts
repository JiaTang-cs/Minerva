import { describe, expect, it } from "vitest";
import {
  buildMinimapViewModel,
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
      computeWorldBounds([{ id: "one", type: "design-draft", x: 10, y: 20, width: 100, height: 50 }], 10),
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
          type: "design-draft",
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

  it("injects the design runtime into the html head", () => {
    const html = "<!DOCTYPE html><html><head></head><body><main>Hello</main></body></html>";

    const result = injectDesignRuntime(html);

    expect(result).toContain("data-dyad-design-runtime");
    expect(result).toContain("dyad-design:set-edit-mode");
    expect(result).toContain("</head>");
  });
});
