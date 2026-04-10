import { describe, expect, it, vi } from "vitest";
import { loadMonacoWithFallback, MonacoLoadError } from "./monaco_loader";

describe("loadMonacoWithFallback", () => {
  it("falls back to the next source when the first one fails", async () => {
    const loadFromVsPath = vi
      .fn<(vsPath: string) => Promise<string>>()
      .mockRejectedValueOnce(new Error("primary failed"))
      .mockResolvedValueOnce("monaco-instance");
    const onPathSelected = vi.fn();

    const result = await loadMonacoWithFallback({
      vsPaths: ["primary", "mirror"],
      loadFromVsPath,
      onPathSelected,
    });

    expect(result).toBe("monaco-instance");
    expect(loadFromVsPath).toHaveBeenNthCalledWith(1, "primary");
    expect(loadFromVsPath).toHaveBeenNthCalledWith(2, "mirror");
    expect(onPathSelected).toHaveBeenCalledWith("mirror");
  });

  it("throws after exhausting all sources", async () => {
    const loadFromVsPath = vi
      .fn<(vsPath: string) => Promise<string>>()
      .mockRejectedValue(new Error("unreachable"));

    await expect(
      loadMonacoWithFallback({
        vsPaths: ["primary", "mirror"],
        loadFromVsPath,
      }),
    ).rejects.toBeInstanceOf(MonacoLoadError);

    expect(loadFromVsPath).toHaveBeenNthCalledWith(1, "primary");
    expect(loadFromVsPath).toHaveBeenNthCalledWith(2, "mirror");
  });
});
