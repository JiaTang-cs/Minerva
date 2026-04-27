import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProviderSettingsPage } from "./ProviderSettingsPage";
import { SETTINGS_CONTENT_SCROLL_ID } from "@/lib/sectionNavigation";

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    settings: {
      providerSettings: {
        openrouter: {
          apiKey: {
            value: "test-key",
          },
        },
      },
    },
    envVars: {},
    loading: false,
    error: null,
    updateSettings: vi.fn(),
  }),
}));

vi.mock("@/hooks/useLanguageModelProviders", () => ({
  useLanguageModelProviders: () => ({
    data: [
      {
        id: "openrouter",
        name: "OpenRouter",
        type: "cloud",
        hasFreeTier: true,
        websiteUrl: "https://openrouter.ai",
        envVarName: "OPENROUTER_API_KEY",
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    history: {
      back: vi.fn(),
    },
  }),
}));

vi.mock("./ProviderSettingsHeader", () => ({
  ProviderSettingsHeader: ({ providerDisplayName }: { providerDisplayName: string }) => (
    <div>{providerDisplayName}</div>
  ),
}));

vi.mock("./ApiKeyConfiguration", () => ({
  ApiKeyConfiguration: () => <div>API key configuration</div>,
}));

vi.mock("./ModelsSection", () => ({
  ModelsSection: ({ providerId }: { providerId: string }) => (
    <div>Models for {providerId}</div>
  ),
}));

describe("ProviderSettingsPage", () => {
  it("renders provider details inside the shared settings scroll container", () => {
    render(<ProviderSettingsPage provider="openrouter" />);

    const scrollContainer = document.getElementById(SETTINGS_CONTENT_SCROLL_ID);

    expect(scrollContainer).toBeTruthy();
    expect(scrollContainer?.className).toContain("overflow-y-auto");
    expect(screen.getByText("OpenRouter")).toBeTruthy();
    expect(screen.getByText("API key configuration")).toBeTruthy();
    expect(screen.getByText("Models for openrouter")).toBeTruthy();
  });
});
