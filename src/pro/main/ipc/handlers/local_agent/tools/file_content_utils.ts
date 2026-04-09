export type LineEndingType = "LF" | "CRLF";

export function normalizeLineEndings(content: string): string {
  return content.split("\r\n").join("\n");
}

export function detectLineEndings(content: string): LineEndingType {
  let crlfCount = 0;
  let lfCount = 0;

  for (let i = 0; i < content.length; i++) {
    if (content[i] !== "\n") {
      continue;
    }

    if (i > 0 && content[i - 1] === "\r") {
      crlfCount += 1;
    } else {
      lfCount += 1;
    }
  }

  return crlfCount > lfCount ? "CRLF" : "LF";
}

export function applyLineEndings(
  content: string,
  lineEndings: LineEndingType,
): string {
  if (lineEndings === "CRLF") {
    return normalizeLineEndings(content).split("\n").join("\r\n");
  }

  return normalizeLineEndings(content);
}
