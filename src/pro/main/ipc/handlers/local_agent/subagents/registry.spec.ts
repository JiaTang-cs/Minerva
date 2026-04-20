import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadSubagentRegistry, resolveSubagentTools } from "./registry";

const createdDirs: string[] = [];

async function makeTempApp(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dyad-subagents-"));
  createdDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    createdDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("subagent registry", () => {
  it("loads built-ins and lets custom agents override built-ins", async () => {
    const appPath = await makeTempApp();
    const agentsDir = path.join(appPath, ".minerva", "agents");
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.writeFile(
      path.join(agentsDir, "worker.md"),
      `---
name: worker
description: Custom worker override
---
You are the custom worker prompt.`,
      "utf-8",
    );

    const registry = await loadSubagentRegistry(appPath);
    const worker = registry.activeSubagents.find((agent) => agent.name === "worker");
    const explore = registry.activeSubagents.find(
      (agent) => agent.name === "explore",
    );

    expect(worker?.source).toBe("custom");
    expect(worker?.description).toBe("Custom worker override");
    expect(explore?.source).toBe("built-in");
    expect(registry.failedFiles).toEqual([]);
  });

  it("collects malformed custom agent errors", async () => {
    const appPath = await makeTempApp();
    const agentsDir = path.join(appPath, ".minerva", "agents");
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.writeFile(
      path.join(agentsDir, "broken.md"),
      `---
name: broken
---
Missing description`,
      "utf-8",
    );

    const registry = await loadSubagentRegistry(appPath);

    expect(registry.failedFiles).toHaveLength(1);
    expect(registry.failedFiles[0]?.path).toContain("broken.md");
  });

  it("filters explore down to read-only tool names and strips task", () => {
    const explore = {
      name: "explore",
      description: "explore",
      source: "built-in" as const,
      getSystemPrompt: () => "explore",
    };

    const resolved = resolveSubagentTools(explore, {
      availableToolDefinitions: [
        { name: "task", modifiesState: false },
        { name: "read_file", modifiesState: false },
        { name: "grep", modifiesState: false },
        { name: "write_file", modifiesState: true },
        { name: "edit_file", modifiesState: true },
      ] as any,
    });

    expect(resolved.toolNames).not.toContain("task");
    const writeLike = ["write_file", "edit_file"];
    for (const toolName of writeLike) {
      expect(resolved.toolNames).not.toContain(toolName);
    }
  });
});
