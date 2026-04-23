import fs from "node:fs";
import path from "node:path";
import { expect } from "@playwright/test";
import { Timeout, testSkipIfWindows } from "./helpers/test_helper";

testSkipIfWindows(
  "design mode - build from design starts a new agent chat from the latest saved draft",
  async ({ po }) => {
    await po.setUpDyadPro({ localAgent: true });
    await po.importApp("minimal");
    await po.chatActions.selectChatMode("design" as any);

    const appPath = await po.appManagement.getCurrentAppPath();

    await po.sendPrompt("tc=local-agent/design-draft");

    const buildButton = po.page.getByRole("button", {
      name: "Build from Design",
    });
    await expect(buildButton).toBeVisible({ timeout: Timeout.MEDIUM });

    const initialUrl = po.page.url();
    const initialChatIdMatch = initialUrl.match(/[?&]id=(\d+)/);
    expect(initialChatIdMatch).not.toBeNull();
    const initialChatId = initialChatIdMatch![1];

    const designFrame = po.page
      .locator('iframe[title*="Design draft"]')
      .contentFrame();
    await expect(designFrame.getByText("Task Mobile")).toBeVisible({
      timeout: Timeout.MEDIUM,
    });

    await designFrame.locator("h1").evaluate((node) => {
      node.textContent = "Task Mobile Built";
    });

    await buildButton.click();

    await expect(async () => {
      const currentUrl = po.page.url();
      const match = currentUrl.match(/[?&]id=(\d+)/);
      expect(match).not.toBeNull();
      expect(match![1]).not.toEqual(initialChatId);
    }).toPass({ timeout: Timeout.MEDIUM });

    await expect(po.page.getByText("/build")).toBeVisible({
      timeout: Timeout.MEDIUM,
    });

    const designDir = path.join(appPath!, ".minerva", "designs");
    await expect(async () => {
      const files = fs.readdirSync(designDir).filter((file) =>
        file.endsWith(".json"),
      );
      expect(files.length).toBeGreaterThan(0);

      const draft = JSON.parse(
        fs.readFileSync(path.join(designDir, files[0]), "utf8"),
      ) as { html: string };
      expect(draft.html).toContain("Task Mobile Built");
    }).toPass({ timeout: Timeout.MEDIUM });
  },
);
