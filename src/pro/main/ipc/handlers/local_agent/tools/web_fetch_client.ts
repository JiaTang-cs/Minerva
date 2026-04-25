import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { getEnvVar } from "@/ipc/utils/read_env";

const JINA_READER_BASE_URL = "https://r.jina.ai/";

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  return parsed.toString();
}

export async function fetchWebPageMarkdown(url: string): Promise<string> {
  const apiKey = getEnvVar("JINA_API_KEY")?.trim();
  if (!apiKey) {
    throw new DyadError(
      "Web fetch API key is not configured. Set JINA_API_KEY in your environment.",
      DyadErrorKind.Precondition,
    );
  }

  const normalizedUrl = normalizeUrl(url);
  const response = await fetch(`${JINA_READER_BASE_URL}${normalizedUrl}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "text/plain",
      "X-Return-Format": "markdown",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new DyadError(
      `Web fetch failed: ${response.status} ${response.statusText} - ${errorText}`,
      DyadErrorKind.External,
    );
  }

  const markdown = (await response.text()).trim();
  if (!markdown) {
    throw new DyadError(
      "No content available from web fetch",
      DyadErrorKind.NotFound,
    );
  }

  return markdown;
}
