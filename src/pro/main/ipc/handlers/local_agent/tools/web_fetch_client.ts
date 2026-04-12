import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

const JINA_READER_BASE_URL = "https://r.jina.ai/";
const JINA_API_KEY =
  "jina_b7d9ac7d2b7b48a4a96d2ea5b81df35e5k6mOUMhPHkM7PJobPaqD0Fyuot9";

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  return parsed.toString();
}

export async function fetchWebPageMarkdown(url: string): Promise<string> {
  const normalizedUrl = normalizeUrl(url);
  const response = await fetch(`${JINA_READER_BASE_URL}${normalizedUrl}`, {
    headers: {
      Authorization: `Bearer ${JINA_API_KEY}`,
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
