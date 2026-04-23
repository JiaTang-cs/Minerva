type FrontmatterValue =
  | string
  | boolean
  | string[]
  | Record<string, string | boolean | string[]>;

export function parseFrontmatter(raw: string): {
  data: Record<string, FrontmatterValue>;
  content: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: raw };
  }

  const yaml = match[1] ?? "";
  const lines = yaml.split(/\r?\n/);
  const data: Record<string, FrontmatterValue> = {};

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trimEnd() ?? "";
    if (!line || line.trimStart().startsWith("#")) {
      continue;
    }

    const rootMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!rootMatch) {
      continue;
    }

    const key = rootMatch[1]!;
    const rawValue = rootMatch[2] ?? "";

    if (rawValue.trim() === "") {
      const arrayValues: string[] = [];
      let nestedObject:
        | Record<string, string | boolean | string[]>
        | undefined = undefined;

      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1] ?? "";
        if (!nextLine.startsWith("  ")) {
          break;
        }

        i += 1;
        const trimmed = nextLine.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }

        const arrayMatch = trimmed.match(/^-\s*(.+)$/);
        if (arrayMatch) {
          arrayValues.push(stripQuotes(arrayMatch[1]!));
          continue;
        }

        const nestedMatch = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (nestedMatch) {
          nestedObject ??= {};
          nestedObject[nestedMatch[1]!] = parseScalar(nestedMatch[2] ?? "");
        }
      }

      if (arrayValues.length > 0) {
        data[key] = arrayValues;
      } else if (nestedObject) {
        data[key] = nestedObject;
      } else {
        data[key] = "";
      }
      continue;
    }

    if (rawValue.trim().startsWith("[") && rawValue.trim().endsWith("]")) {
      data[key] = parseInlineArray(rawValue);
      continue;
    }

    data[key] = parseScalar(rawValue);
  }

  return { data, content: match[2] ?? "" };
}

function parseInlineArray(value: string): string[] {
  const inner = value.trim().slice(1, -1).trim();
  if (!inner) {
    return [];
  }

  return inner
    .split(",")
    .map((part) => stripQuotes(part.trim()))
    .filter(Boolean);
}

function parseScalar(value: string): string | boolean {
  const trimmed = stripQuotes(value.trim());
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  return trimmed;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
