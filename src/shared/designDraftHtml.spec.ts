import { describe, expect, it } from "vitest";
import { stripDesignEditorArtifactsForHandoff } from "./designDraftHtml";

describe("stripDesignEditorArtifactsForHandoff", () => {
  it("strips persisted editor attributes and runtime tags for handoff", () => {
    const html = `<!DOCTYPE html>
<html>
  <head>
    <style data-dyad-design-runtime>body { color: red; }</style>
  </head>
  <body data-dyad-design-edit-mode="true">
    <main data-dyad-id="dyad-el-1" data-dyad-selected="true">Hello</main>
    <script data-dyad-design-runtime>console.log("runtime");</script>
  </body>
</html>`;

    const stripped = stripDesignEditorArtifactsForHandoff(html);

    expect(stripped).toContain("<!DOCTYPE html>");
    expect(stripped).toContain("<main>Hello</main>");
    expect(stripped).not.toContain("data-dyad-id");
    expect(stripped).not.toContain("data-dyad-selected");
    expect(stripped).not.toContain("data-dyad-design-edit-mode");
    expect(stripped).not.toContain("data-dyad-design-runtime");
    expect(stripped).not.toContain("console.log");
  });
});
