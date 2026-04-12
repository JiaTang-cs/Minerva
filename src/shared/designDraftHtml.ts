const RUNTIME_TAG_PATTERN =
  /<(style|script)\b[^>]*\sdata-dyad-design-runtime(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?[^>]*>[\s\S]*?<\/\1>/gi;

function stripAttribute(html: string, attributeName: string): string {
  const doubleQuoted = new RegExp(
    `\\s${attributeName}="[^"]*"`,
    "gi",
  );
  const singleQuoted = new RegExp(
    `\\s${attributeName}='[^']*'`,
    "gi",
  );
  const bare = new RegExp(`\\s${attributeName}(?=[\\s>])`, "gi");

  return html
    .replace(doubleQuoted, "")
    .replace(singleQuoted, "")
    .replace(bare, "");
}

export function stripDesignEditorArtifactsForHandoff(html: string): string {
  let next = html.replace(RUNTIME_TAG_PATTERN, "");

  next = stripAttribute(next, "data-dyad-selected");
  next = stripAttribute(next, "data-dyad-id");
  next = stripAttribute(next, "data-dyad-design-edit-mode");

  return next.trim();
}
