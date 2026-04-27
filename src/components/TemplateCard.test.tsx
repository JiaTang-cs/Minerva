import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TemplateCard } from "./TemplateCard";
import type { Template } from "@/shared/templates";
import { ipc } from "@/ipc/types";

vi.mock("@/ipc/types", () => ({
  ipc: {
    system: {
      openExternalUrl: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    settings: {
      acceptedCommunityCode: true,
      selectedTemplateId: "test-template",
    },
    updateSettings: vi.fn(),
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "templateCard.viewOnGitHub": "View on GitHub",
        "templateCard.official": "Official",
        createApp: "Create App",
      };
      return translations[key] ?? key;
    },
  }),
}));

const baseTemplate: Template = {
  id: "test-template",
  title: "Test Template",
  description: "A test template.",
  imageUrl: "https://example.com/template.png",
  githubUrl: "https://github.com/example/template",
  isOfficial: true,
};

function renderTemplateCard(template: Template) {
  return render(
    <TemplateCard
      template={template}
      isSelected={true}
      onSelect={vi.fn()}
      onCreateApp={vi.fn()}
    />,
  );
}

describe("TemplateCard", () => {
  it("opens the GitHub URL for templates that show the GitHub link", () => {
    renderTemplateCard(baseTemplate);

    fireEvent.click(screen.getByText("View on GitHub"));

    expect(ipc.system.openExternalUrl).toHaveBeenCalledWith(
      "https://github.com/example/template",
    );
  });

  it("does not render the GitHub link when the template hides it", () => {
    renderTemplateCard({
      ...baseTemplate,
      hideGithubLink: true,
    });

    expect(screen.queryByText("View on GitHub")).toBeNull();
  });
});
