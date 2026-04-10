import { describe, expect, it } from "vitest";
import {
  getSettingsSearchIndex,
  SECTION_IDS,
  SETTING_IDS,
} from "./settingsSearchIndex";
import i18n from "@/i18n";

describe("getSettingsSearchIndex", () => {
  it("includes the block unsafe npm packages experiment", () => {
    const settingsSearchIndex = getSettingsSearchIndex({
      tSettings: (key, options) =>
        i18n.getFixedT("en", "settings")(key as any, options),
      tHome: (key, options) =>
        i18n.getFixedT("en", "home")(key as any, options),
    });
    expect(
      settingsSearchIndex.find(
        (item) => item.id === SETTING_IDS.blockUnsafeNpmPackages,
      ),
    ).toEqual({
      id: SETTING_IDS.blockUnsafeNpmPackages,
      label: "Block unsafe npm packages",
      description: "Use socket.dev to detect unsafe packages and block them.",
      keywords: ["socket", "npm", "firewall", "package", "unsafe", "security"],
      sectionId: SECTION_IDS.experiments,
      sectionLabel: "Experiments",
    });
  });
});
