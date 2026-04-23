import path from "node:path";

export const INTERNAL_APP_DIR_NAME = ".minerva";

export function getInternalAppDirPath(appPath: string): string {
  return path.join(appPath, INTERNAL_APP_DIR_NAME);
}

export function getInternalAppSubdirPath(
  appPath: string,
  subdir: string,
): string {
  return path.join(getInternalAppDirPath(appPath), subdir);
}

export function getInternalRelativeSubdirPath(subdir: string): string {
  return `${INTERNAL_APP_DIR_NAME}/${subdir}`;
}

