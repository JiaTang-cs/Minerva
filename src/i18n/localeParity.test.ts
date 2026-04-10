import { describe, expect, it } from "vitest";
import enCommon from "./locales/en/common.json";
import enSettings from "./locales/en/settings.json";
import enChat from "./locales/en/chat.json";
import enHome from "./locales/en/home.json";
import enErrors from "./locales/en/errors.json";
import zhCommon from "./locales/zh-CN/common.json";
import zhSettings from "./locales/zh-CN/settings.json";
import zhChat from "./locales/zh-CN/chat.json";
import zhHome from "./locales/zh-CN/home.json";
import zhErrors from "./locales/zh-CN/errors.json";

function collectKeys(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectKeys(item, `${prefix}[${index}]`),
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      collectKeys(nestedValue, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("zh-CN locale parity", () => {
  it("matches the English key structure for active namespaces", () => {
    const namespaces = [
      ["common", enCommon, zhCommon],
      ["settings", enSettings, zhSettings],
      ["chat", enChat, zhChat],
      ["home", enHome, zhHome],
      ["errors", enErrors, zhErrors],
    ] as const;

    for (const [namespace, enLocale, zhLocale] of namespaces) {
      expect(collectKeys(zhLocale), `${namespace} namespace`).toEqual(
        collectKeys(enLocale),
      );
    }
  });
});
