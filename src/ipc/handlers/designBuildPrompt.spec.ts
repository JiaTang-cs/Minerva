import { describe, expect, it } from "vitest";
import { createBuildFromDesignPrompt } from "./designBuildPrompt";

describe("createBuildFromDesignPrompt", () => {
  it("includes the draft metadata and html source", () => {
    const prompt = createBuildFromDesignPrompt({
      id: "draft-123",
      appId: 7,
      chatId: 11,
      title: "Task app design",
      brief: "A mobile-first task app",
      deviceMode: "mobile",
      html: "<!DOCTYPE html><html><head></head><body><main>Draft</main></body></html>",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    expect(prompt).toContain("## Task app design");
    expect(prompt).toContain("A mobile-first task app");
    expect(prompt).toContain("Primary device: mobile");
    expect(prompt).toContain(".minerva/designs/draft-123.json");
    expect(prompt).toContain("<main>Draft</main>");
    expect(prompt).toContain("Build a complete application");
  });

  it("strips editor metadata before embedding html in the build prompt", () => {
    const prompt = createBuildFromDesignPrompt({
      id: "draft-123",
      appId: 7,
      chatId: 11,
      title: "Task app design",
      brief: "A mobile-first task app",
      deviceMode: "mobile",
      html: '<!DOCTYPE html><html><head><style data-dyad-design-runtime>body{}</style></head><body data-dyad-design-edit-mode="true"><main data-dyad-id="dyad-el-1" data-dyad-selected="true">Draft</main><script data-dyad-design-runtime>noop()</script></body></html>',
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    expect(prompt).toContain("<main>Draft</main>");
    expect(prompt).not.toContain("data-dyad-id");
    expect(prompt).not.toContain("data-dyad-selected");
    expect(prompt).not.toContain("data-dyad-design-edit-mode");
    expect(prompt).not.toContain("data-dyad-design-runtime");
    expect(prompt).not.toContain("noop()");
  });
});
