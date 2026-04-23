import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSkillRegistryPrompt,
  buildInjectedSkillPrompt,
  parseSkillMarkdown,
} from "@/ipc/utils/skills/registry";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dyad-skill-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("parseSkillMarkdown", () => {
  it("parses frontmatter fields and body content", async () => {
    const dir = await createTempDir();
    const skillDir = path.join(dir, "verify");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: verify
description: Verify the current app flow
when_to_use: Before shipping a feature
allowed-tools:
  - read_logs
  - web_fetch
user-invocable: true
disable-model-invocation: false
---
Check the preview, logs, and output before reporting success.
`,
      "utf-8",
    );

    const parsed = await parseSkillMarkdown(path.join(skillDir, "SKILL.md"));
    expect(parsed.name).toBe("verify");
    expect(parsed.description).toBe("Verify the current app flow");
    expect(parsed.whenToUse).toBe("Before shipping a feature");
    expect(parsed.allowedTools).toEqual(["read_logs", "web_fetch"]);
    expect(parsed.userInvocable).toBe(true);
    expect(parsed.disableModelInvocation).toBe(false);
    expect(parsed.body).toContain("Check the preview");
  });

  it("throws when description is missing", async () => {
    const dir = await createTempDir();
    const skillDir = path.join(dir, "broken");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: broken
---
No description here.
`,
      "utf-8",
    );

    await expect(
      parseSkillMarkdown(path.join(skillDir, "SKILL.md")),
    ).rejects.toThrow(/description/i);
  });
});

describe("buildInjectedSkillPrompt", () => {
  it("includes source, description, and optional args", () => {
    const prompt = buildInjectedSkillPrompt(
      {
        name: "verify",
        description: "Verify the app before calling it done.",
        sourceType: "user",
        baseDir: "/tmp/verify",
        body: "Run through the expected user flow.",
        whenToUse: "Before handing work back to the user",
      },
      "focus on login and checkout",
    );

    expect(prompt).toContain('You must follow the skill "verify".');
    expect(prompt).toContain("Skill source: user");
    expect(prompt).toContain("Skill arguments: focus on login and checkout");
    expect(prompt).toContain("Run through the expected user flow.");
  });
});

describe("buildSkillRegistryPrompt", () => {
  it("lists only agent-invocable skills and includes metadata for the prompt", () => {
    const prompt = buildSkillRegistryPrompt([
      {
        name: "verify",
        description: "Verify the app before calling it done.",
        whenToUse: "Before handing work back to the user",
        sourceType: "user",
        userInvocable: true,
        disableModelInvocation: false,
        allowedTools: ["read_file", "run_command"],
      },
      {
        name: "private-skill",
        description: "Hidden from model use.",
        whenToUse: null,
        sourceType: "project",
        userInvocable: false,
        disableModelInvocation: true,
        allowedTools: [],
      },
    ]);

    expect(prompt).toContain("<available_skills>");
    expect(prompt).toContain("The following are the only valid skills");
    expect(prompt).toContain("Never guess a skill name");
    expect(prompt).toContain("- skill: verify");
    expect(prompt).toContain("source: user");
    expect(prompt).toContain("slash_command: /verify");
    expect(prompt).toContain("allowed_tools: read_file, run_command");
    expect(prompt).not.toContain("private-skill");
  });
});
