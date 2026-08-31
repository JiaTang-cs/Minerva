import { describe, expect, it } from "vitest";
import { resolveImageGenerationConfig } from "./image_generation";
import { DEFAULT_IMAGE_GENERATION_MODEL_BY_PROVIDER } from "@/lib/imageGeneration";
import type { UserSettings } from "@/lib/schemas";

function makeSettings(partial: Partial<UserSettings> = {}): UserSettings {
  return {
    selectedModel: { name: "auto", provider: "auto" },
    providerSettings: {},
    telemetryConsent: "unset",
    telemetryUserId: "test-user",
    hasRunBefore: false,
    experiments: {},
    enableProLazyEditsMode: true,
    enableProSmartFilesContextMode: true,
    imageGenerationProvider: "openai",
    imageGenerationModel: DEFAULT_IMAGE_GENERATION_MODEL_BY_PROVIDER.openai,
    selectedChatMode: "build",
    enableAutoFixProblems: false,
    enableAutoUpdate: true,
    releaseChannel: "stable",
    selectedTemplateId: "blank",
    selectedThemeId: "default",
    isRunning: false,
    lastKnownPerformance: undefined,
    enableNativeGit: true,
    autoExpandPreviewPanel: true,
    enableContextCompaction: true,
    ...partial,
  };
}

describe("resolveImageGenerationConfig", () => {
  it("prefers stored provider settings api key", () => {
    const settings = makeSettings({
      imageGenerationProvider: "xai",
      imageGenerationModel: "grok-imagine-image",
      providerSettings: {
        xai: {
          apiKey: {
            value: "xai-key",
          },
        },
      },
    });

    expect(resolveImageGenerationConfig(settings)).toEqual({
      provider: "xai",
      model: "grok-imagine-image",
      apiKey: "xai-key",
    });
  });

  it("falls back to the provider default model when model is unset", () => {
    const settings = makeSettings({
      imageGenerationProvider: "minimax",
      imageGenerationModel: undefined,
      providerSettings: {
        minimax: {
          apiKey: {
            value: "minimax-key",
          },
        },
      },
    });

    expect(resolveImageGenerationConfig(settings)).toEqual({
      provider: "minimax",
      model: DEFAULT_IMAGE_GENERATION_MODEL_BY_PROVIDER.minimax,
      apiKey: "minimax-key",
    });
  });
});
