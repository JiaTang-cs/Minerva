import path from "node:path";

export interface ParsedSkillSource {
  type: "github" | "local";
  url: string;
  ref?: string;
  subpath?: string;
}

export function parseSkillSource(input: string): ParsedSkillSource {
  if (
    path.isAbsolute(input) ||
    input.startsWith("./") ||
    input.startsWith("../")
  ) {
    return {
      type: "local",
      url: path.resolve(input),
    };
  }

  const githubTreeMatch = input.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/,
  );
  if (githubTreeMatch) {
    return {
      type: "github",
      url: `https://github.com/${githubTreeMatch[1]}/${githubTreeMatch[2]!.replace(/\.git$/, "")}.git`,
      ref: githubTreeMatch[3],
      subpath: sanitizeSubpath(githubTreeMatch[4]),
    };
  }

  const githubRepoMatch = input.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)$/,
  );
  if (githubRepoMatch) {
    return {
      type: "github",
      url: `https://github.com/${githubRepoMatch[1]}/${githubRepoMatch[2]!.replace(/\.git$/, "")}.git`,
    };
  }

  const shorthandMatch = input.match(/^([^/]+)\/([^/]+)(?:\/(.+))?$/);
  if (shorthandMatch) {
    return {
      type: "github",
      url: `https://github.com/${shorthandMatch[1]}/${shorthandMatch[2]}.git`,
      subpath: sanitizeSubpath(shorthandMatch[3]),
    };
  }

  throw new Error(`Unsupported skill source: ${input}`);
}

export function sanitizeSubpath(subpath?: string): string | undefined {
  if (!subpath) {
    return undefined;
  }

  const normalized = subpath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  for (const segment of segments) {
    if (segment === "..") {
      throw new Error(`Unsafe subpath: ${subpath}`);
    }
  }

  return normalized;
}
