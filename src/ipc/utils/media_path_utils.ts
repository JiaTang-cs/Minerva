import path from "node:path";
import {
  getInternalAppSubdirPath,
  getInternalRelativeSubdirPath,
  INTERNAL_APP_DIR_NAME,
} from "./internal_app_dir";

/**
 * The subdirectory within each app where uploaded media files are stored.
 */
export const INTERNAL_MEDIA_SUBDIR = "media";
export const INTERNAL_MEDIA_DIR_NAME =
  getInternalRelativeSubdirPath(INTERNAL_MEDIA_SUBDIR);

/**
 * Check if an absolute path falls within the app's internal media directory.
 * Used to validate that file copy operations only read from the allowed media dir.
 */
export function isWithinDyadMediaDir(
  absPath: string,
  appPath: string,
): boolean {
  const resolved = path.resolve(absPath);
  const resolvedMediaDir = path.resolve(
    getInternalAppSubdirPath(appPath, INTERNAL_MEDIA_SUBDIR),
  );
  const relativePath = path.relative(resolvedMediaDir, resolved);
  return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

/**
 * Check if an absolute path is a file inside the app's internal media directory
 * (without requiring a known app path). Validates by finding consecutive
 * internal-dir + "media" path segments with at least one segment (filename) after,
 * then confirms the resolved path doesn't escape via ".." traversal.
 */
export function isFileWithinAnyDyadMediaDir(absPath: string): boolean {
  const resolved = path.resolve(absPath);
  const segments = resolved.split(path.sep);

  let mediaIdx = -1;
  for (let i = 0; i < segments.length - 2; i++) {
    if (segments[i] === INTERNAL_APP_DIR_NAME && segments[i + 1] === "media") {
      mediaIdx = i + 1;
      break;
    }
  }
  if (mediaIdx === -1) {
    return false;
  }

  const mediaDirPath = segments.slice(0, mediaIdx + 1).join(path.sep);
  const relativePath = path.relative(mediaDirPath, resolved);
  return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}
