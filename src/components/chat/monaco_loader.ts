export class MonacoLoadError extends Error {
  causes: Error[];

  constructor(message: string, causes: Error[]) {
    super(message);
    this.name = "MonacoLoadError";
    this.causes = causes;
  }
}

export async function loadMonacoWithFallback<T>({
  vsPaths,
  loadFromVsPath,
  onPathSelected,
}: {
  vsPaths: string[];
  loadFromVsPath: (vsPath: string) => Promise<T>;
  onPathSelected?: (vsPath: string) => void;
}): Promise<T> {
  const errors: Error[] = [];

  for (const vsPath of vsPaths) {
    try {
      const monaco = await loadFromVsPath(vsPath);
      onPathSelected?.(vsPath);
      return monaco;
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error
          : new Error(`Failed to load Monaco from ${vsPath}: ${String(error)}`),
      );
    }
  }

  throw new MonacoLoadError("Failed to load Monaco from all sources", errors);
}
