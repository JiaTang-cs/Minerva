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
    expect(prompt).toContain(".dyad/designs/draft-123.json");
    expect(prompt).toContain("<main>Draft</main>");
    expect(prompt).toContain("Build a complete application");
  });
});
