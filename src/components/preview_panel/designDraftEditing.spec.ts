import {
  hasUnsavedDesignChanges,
  normalizeDesignDraftHtml,
  stripDesignRuntimeArtifacts,
} from "./designDraftEditing";

describe("designDraftEditing", () => {
  it("removes runtime artifacts but keeps the html document intact", () => {
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style data-dyad-design-runtime>body { color: red; }</style>
  </head>
  <body data-dyad-design-edit-mode="true">
    <main data-dyad-id="dyad-el-1" data-dyad-selected="true">Hello</main>
    <script data-dyad-design-runtime>console.log("runtime");</script>
  </body>
</html>`;

    const cleaned = stripDesignRuntimeArtifacts(html);

    expect(cleaned).toContain("<!DOCTYPE html>");
    expect(cleaned).toContain("<main>Hello</main>");
    expect(cleaned).not.toContain("data-dyad-design-runtime");
    expect(cleaned).not.toContain("data-dyad-selected");
    expect(cleaned).not.toContain("data-dyad-id");
    expect(cleaned).not.toContain("data-dyad-design-edit-mode");
    expect(cleaned).not.toContain("console.log");
  });

  it("normalizes equivalent html documents to the same value", () => {
    const saved = `<!DOCTYPE html>
<html>
  <head></head>
  <body><main>Hello</main></body>
</html>`;
    const pending = `<!DOCTYPE html>
<html><head><style data-dyad-design-runtime></style></head><body data-dyad-design-edit-mode="true"><main data-dyad-id="one">Hello</main><script data-dyad-design-runtime></script></body></html>`;

    expect(normalizeDesignDraftHtml(saved)).toBe(
      normalizeDesignDraftHtml(pending),
    );
  });

  it("detects unsaved changes after a real html modification", () => {
    const saved = `<!DOCTYPE html><html><head></head><body><main>Hello</main></body></html>`;
    const pending = `<!DOCTYPE html><html><head></head><body><main style="color: rgb(255, 0, 0);">Hello</main></body></html>`;

    expect(hasUnsavedDesignChanges(saved, saved)).toBe(false);
    expect(hasUnsavedDesignChanges(saved, pending)).toBe(true);
  });
});
