const DESIGN_RUNTIME_ATTRIBUTE = "data-dyad-design-runtime";

function removeAttributeFromAll(root: ParentNode, attributeName: string): void {
  root.querySelectorAll(`[${attributeName}]`).forEach((element) => {
    element.removeAttribute(attributeName);
  });
}

export function stripDesignRuntimeArtifacts(html: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  document
    .querySelectorAll(
      `style[${DESIGN_RUNTIME_ATTRIBUTE}], script[${DESIGN_RUNTIME_ATTRIBUTE}]`,
    )
    .forEach((element) => element.remove());

  removeAttributeFromAll(document, "data-dyad-selected");
  removeAttributeFromAll(document, "data-dyad-design-edit-mode");

  if (document.body) {
    document.body.removeAttribute("data-dyad-design-edit-mode");
  }

  return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
}

export function normalizeDesignDraftHtml(html: string): string {
  return stripDesignRuntimeArtifacts(html).replace(/>\s+</g, "><").trim();
}

export function hasUnsavedDesignChanges(
  savedHtml: string | null,
  pendingHtml: string | null,
): boolean {
  if (!savedHtml || !pendingHtml) {
    return false;
  }

  return (
    normalizeDesignDraftHtml(savedHtml) !==
    normalizeDesignDraftHtml(pendingHtml)
  );
}
