import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadCatalogSkillPreview } from "@/ipc/utils/skills/search_install";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), "dyad-skill-preview-test-"),
  );
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("loadCatalogSkillPreview", () => {
  it("loads a skill preview from a local source root", async () => {
    const repoDir = await createTempDir();
    const skillDir = path.join(repoDir, "skills", "preview-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: preview-skill
description: Preview this remote skill before installation
when_to_use: When browsing the catalog
allowed-tools:
  - web_fetch
  - read
---
# Preview Skill

This skill helps users inspect a remote skill before installing it.
`,
      "utf-8",
    );

    const preview = await loadCatalogSkillPreview({
      source: repoDir,
      skillId: "preview-skill",
    });

    expect(preview.name).toBe("preview-skill");
    expect(preview.description).toBe(
      "Preview this remote skill before installation",
    );
    expect(preview.whenToUse).toBe("When browsing the catalog");
    expect(preview.allowedTools).toEqual(["web_fetch", "read"]);
    expect(preview.installCommand).toContain("--skill preview-skill");
    expect(preview.body).toContain("This skill helps users inspect");

    await fs.rm(preview.tempDir, { recursive: true, force: true });
  });
});
