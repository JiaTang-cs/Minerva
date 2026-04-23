import { describe, expect, it } from "vitest";

import {
  buildPreviewProxyStartedSystemMessage,
  isPreviewProxyStartedSystemMessage,
  parsePreviewProxyStartedSystemMessage,
  PREVIEW_PROXY_SERVER_SYSTEM_MESSAGE_PREFIX,
} from "./proxyServerSystemMessage";

describe("proxyServerSystemMessage", () => {
  it("builds and parses the preview proxy started system message", () => {
    const message = buildPreviewProxyStartedSystemMessage(
      "http://127.0.0.1:4100",
      "http://localhost:3000",
    );

    expect(message).toBe(
      "[minerva-proxy-server]started=[http://127.0.0.1:4100] original=[http://localhost:3000]",
    );
    expect(PREVIEW_PROXY_SERVER_SYSTEM_MESSAGE_PREFIX).toBe(
      "minerva-proxy-server",
    );
    expect(isPreviewProxyStartedSystemMessage(message)).toBe(true);
    expect(parsePreviewProxyStartedSystemMessage(message)).toEqual({
      proxyUrl: "http://127.0.0.1:4100",
      originalUrl: "http://localhost:3000",
    });
  });

  it("returns null for unrelated messages", () => {
    expect(
      parsePreviewProxyStartedSystemMessage(
        "proxy-server-start url=http://127.0.0.1:4100",
      ),
    ).toBeNull();
    expect(isPreviewProxyStartedSystemMessage("started=[x]")).toBe(false);
  });
});
