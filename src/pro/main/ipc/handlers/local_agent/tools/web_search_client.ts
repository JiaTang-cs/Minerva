import { z } from "zod";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

const SERPER_API_URL = "https://google.serper.dev/search";
const SERPER_API_KEY = "234b575dd63c3188f3477aecfb8f09fe7d04edaf";
const MAX_RESULTS = 5;

const serperOrganicResultSchema = z.object({
  title: z.string().optional(),
  link: z.string().optional(),
  snippet: z.string().optional(),
});

const serperResponseSchema = z.object({
  answerBox: z
    .object({
      title: z.string().optional(),
      answer: z.string().optional(),
      snippet: z.string().optional(),
      link: z.string().optional(),
    })
    .optional(),
  knowledgeGraph: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
  organic: z.array(serperOrganicResultSchema).optional(),
});

export interface WebSearchResultItem {
  title: string;
  url: string;
  snippet?: string;
}

export interface WebSearchResult {
  results: WebSearchResultItem[];
}

function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function searchWeb(query: string): Promise<WebSearchResult> {
  const response = await fetch(SERPER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": SERPER_API_KEY,
    },
    body: JSON.stringify({ q: query, num: MAX_RESULTS }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new DyadError(
      `Web search failed: ${response.status} ${response.statusText} - ${errorText}`,
      DyadErrorKind.External,
    );
  }

  const parsed = serperResponseSchema.parse(await response.json());
  const results: WebSearchResultItem[] = [];

  const answerTitle =
    cleanText(parsed.answerBox?.title) ?? cleanText(parsed.knowledgeGraph?.title);
  const answerUrl =
    cleanText(parsed.answerBox?.link) ??
    cleanText(parsed.knowledgeGraph?.website);
  const answerSnippet =
    cleanText(parsed.answerBox?.answer) ??
    cleanText(parsed.answerBox?.snippet) ??
    cleanText(parsed.knowledgeGraph?.description);

  if (answerTitle && answerUrl) {
    results.push({
      title: answerTitle,
      url: answerUrl,
      snippet: answerSnippet,
    });
  }

  for (const item of parsed.organic ?? []) {
    const title = cleanText(item.title);
    const url = cleanText(item.link);

    if (!title || !url) {
      continue;
    }

    if (results.some((existing) => existing.url === url)) {
      continue;
    }

    results.push({
      title,
      url,
      snippet: cleanText(item.snippet),
    });

    if (results.length >= MAX_RESULTS) {
      break;
    }
  }

  return { results };
}

export function formatWebSearchResults(
  query: string,
  result: WebSearchResult,
): string {
  if (result.results.length === 0) {
    return `No web search results found for "${query}".`;
  }

  const lines = [`Web search results for "${query}":`];

  for (const [index, item] of result.results.entries()) {
    lines.push(`${index + 1}. ${item.title}`);
    lines.push(`   URL: ${item.url}`);
    if (item.snippet) {
      lines.push(`   Snippet: ${item.snippet}`);
    }
  }

  lines.push(
    "",
    "Use markdown hyperlinks when citing these sources back to the user.",
  );

  return lines.join("\n");
}
