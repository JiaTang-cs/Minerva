import type { PropsWithChildren } from "react";
import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { describe, expect, it } from "vitest";
import { DyadMarkdownParser } from "./DyadMarkdownParser";

function makeWrapper() {
  const store = createStore();
  return function Wrapper({ children }: PropsWithChildren) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe("DyadMarkdownParser", () => {
  it("renders dyad skill result tags as structured cards", () => {
    render(
      <DyadMarkdownParser content='Before <dyad-skill-result skill="kiro-skill" source="user">Interactive workflow</dyad-skill-result> After' />,
      { wrapper: makeWrapper() },
    );

    expect(screen.getByTestId("dyad-skill-result")).toBeTruthy();
    expect(screen.getByText("kiro-skill")).toBeTruthy();
    expect(screen.getByText("Skill Loaded")).toBeTruthy();
    expect(screen.queryByText(/<dyad-skill-result/i)).toBeNull();
  });
});
