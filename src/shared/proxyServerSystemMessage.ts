export const PREVIEW_PROXY_SERVER_SYSTEM_MESSAGE_PREFIX =
  "minerva-proxy-server";

const PREVIEW_PROXY_SERVER_STARTED_PREFIX = `[${PREVIEW_PROXY_SERVER_SYSTEM_MESSAGE_PREFIX}]started=[`;

const escapeForRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PREVIEW_PROXY_SERVER_STARTED_REGEX = new RegExp(
  `\\[${escapeForRegex(PREVIEW_PROXY_SERVER_SYSTEM_MESSAGE_PREFIX)}\\]started=\\[(.*?)\\]`,
);

const PREVIEW_PROXY_SERVER_ORIGINAL_REGEX = /original=\[(.*?)\]/;

export function buildPreviewProxyStartedSystemMessage(
  proxyUrl: string,
  originalUrl: string,
): string {
  return `${PREVIEW_PROXY_SERVER_STARTED_PREFIX}${proxyUrl}] original=[${originalUrl}]`;
}

export function isPreviewProxyStartedSystemMessage(message: string): boolean {
  return message.includes(PREVIEW_PROXY_SERVER_STARTED_PREFIX);
}

export function parsePreviewProxyStartedSystemMessage(message: string): {
  proxyUrl: string;
  originalUrl: string | null;
} | null {
  const proxyUrlMatch = message.match(PREVIEW_PROXY_SERVER_STARTED_REGEX);
  if (!proxyUrlMatch?.[1]) {
    return null;
  }

  const originalUrlMatch = message.match(PREVIEW_PROXY_SERVER_ORIGINAL_REGEX);

  return {
    proxyUrl: proxyUrlMatch[1],
    originalUrl: originalUrlMatch?.[1] ?? null,
  };
}
