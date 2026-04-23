import { describe, expect, it } from "vitest";
import {
  parseSkillSource,
  sanitizeSubpath,
} from "@/ipc/utils/skills/source_parser";

describe("parseSkillSource", () => {
  it("parses owner/repo shorthand as a GitHub source", () => {
    expect(parseSkillSource("anthropics/skills")).toEqual({
      type: "github",
      url: "https://github.com/anthropics/skills.git",
      subpath: undefined,
    });
  });

  it("parses GitHub tree URLs with refs and subpaths", () => {
    expect(
      parseSkillSource(
        "https://github.com/anthropics/skills/tree/main/skills/frontend-design",
      ),
    ).toEqual({
      type: "github",
      url: "https://github.com/anthropics/skills.git",
      ref: "main",
      subpath: "skills/frontend-design",
    });
  });
});

describe("sanitizeSubpath", () => {
  it("rejects traversal attempts", () => {
    expect(() => sanitizeSubpath("../secret")).toThrow(/unsafe subpath/i);
  });
});
