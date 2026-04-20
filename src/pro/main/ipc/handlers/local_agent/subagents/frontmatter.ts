type ParsedFrontmatter = {
  frontmatter: Record<string, unknown>;
  body: string;
};

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (
    (trimmed.startsWith(`"`) && trimmed.endsWith(`"`)) ||
    (trimmed.startsWith(`'`) && trimmed.endsWith(`'`))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseMarkdownFrontmatter(content: string): ParsedFrontmatter {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return { frontmatter: {}, body: content };
  }

  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Invalid frontmatter block");
  }

  const frontmatterText = match[1] ?? "";
  const body = match[2] ?? "";
  const frontmatter: Record<string, unknown> = {};
  let currentArrayKey: string | null = null;

  for (const rawLine of frontmatterText.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const arrayMatch = line.match(/^\s*-\s+(.*)$/);
    if (arrayMatch) {
      if (!currentArrayKey) {
        throw new Error("Array entry without a key");
      }
      const arr = frontmatter[currentArrayKey];
      if (!Array.isArray(arr)) {
        throw new Error(`Invalid array for key '${currentArrayKey}'`);
      }
      arr.push(String(parseScalar(arrayMatch[1] ?? "")));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) {
      throw new Error(`Unsupported frontmatter line: ${line}`);
    }

    const [, key, rawValue] = keyMatch;
    if (rawValue === "") {
      frontmatter[key] = [];
      currentArrayKey = key;
    } else {
      frontmatter[key] = parseScalar(rawValue);
      currentArrayKey = null;
    }
  }

  return { frontmatter, body };
}
