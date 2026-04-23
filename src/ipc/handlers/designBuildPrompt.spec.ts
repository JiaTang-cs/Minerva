import { describe, expect, it } from "vitest";
import { createBuildFromDesignPrompt } from "./designBuildPrompt";

describe("createBuildFromDesignPrompt", () => {
  it("includes draft metadata and points the implementation agent to design files", () => {
    const prompt = createBuildFromDesignPrompt({
      draft: {
        id: "draft-123",
        appId: 7,
        chatId: 11,
        title: "Task app design",
        brief: "A mobile-first task app",
        deviceMode: "mobile",
        html: "<!DOCTYPE html><html><head></head><body><main>Draft</main></body></html>",
        flowId: "flow-123",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      flow: {
        id: "flow-123",
        appId: 7,
        chatId: 11,
        title: "Task Flow",
        rootDraftId: "draft-123",
        status: "ready",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      flowPages: [
        {
          id: "page-1",
          flowId: "flow-123",
          draftId: "draft-123",
          title: "Home",
          prompt: "Main landing page",
          role: "root",
          order: 0,
          sourceDraftId: null,
          status: "ready",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      components: [
        {
          id: "component-1",
          appId: 7,
          flowId: "flow-123",
          draftId: "draft-123",
          name: "NavBar",
          description: "Main navigation",
          htmlTemplate: "<nav></nav>",
          previewHtml: "<nav></nav>",
          props: [],
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(prompt).toContain("## Task app design");
    expect(prompt).toContain("A mobile-first task app");
    expect(prompt).toContain("Primary device: mobile");
    expect(prompt).toContain(".minerva/designs/drafts/draft-123.json");
    expect(prompt).toContain(".minerva/designs/flows/flow-123.json");
    expect(prompt).toContain(".minerva/designs/components/component-1.json");
    expect(prompt).toContain("Read the design data from the project's .minerva directory");
    expect(prompt).toContain("Build a complete application");
  });

  it("does not inline the full design html into the build prompt", () => {
    const prompt = createBuildFromDesignPrompt({
      draft: {
        id: "draft-123",
        appId: 7,
        chatId: 11,
        title: "Task app design",
        brief: "A mobile-first task app",
        deviceMode: "mobile",
        html: '<!DOCTYPE html><html><head><style data-dyad-design-runtime>body{}</style></head><body data-dyad-design-edit-mode="true"><main data-dyad-id="dyad-el-1" data-dyad-selected="true">Draft</main><script data-dyad-design-runtime>noop()</script></body></html>',
        flowId: "flow-123",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      flow: null,
      flowPages: [],
      components: [],
    });

    expect(prompt).not.toContain("<main>Draft</main>");
    expect(prompt).not.toContain("data-dyad-id");
    expect(prompt).not.toContain("data-dyad-selected");
    expect(prompt).not.toContain("data-dyad-design-edit-mode");
    expect(prompt).not.toContain("data-dyad-design-runtime");
    expect(prompt).not.toContain("noop()");
  });
});
