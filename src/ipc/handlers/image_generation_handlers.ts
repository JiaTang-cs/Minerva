import { createTypedHandler } from "./base";
import { imageGenerationContracts } from "../types/image_generation";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readSettings } from "@/main/settings";
import {
  generateImageWithProvider,
  resolveImageGenerationConfig,
  saveGeneratedImageToMedia,
} from "../utils/image_generation";

export function registerImageGenerationHandlers() {
  const pendingRequests = new Map<string, AbortController>();

  createTypedHandler(
    imageGenerationContracts.generateImage,
    async (_, input) => {
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, input.targetAppId),
      });

      if (!app) {
        throw new DyadError("App not found.", DyadErrorKind.NotFound);
      }

      const settings = readSettings();
      const config = resolveImageGenerationConfig(settings);
      const controller = new AbortController();
      pendingRequests.set(input.requestId, controller);

      try {
        const image = await generateImageWithProvider(settings, {
          provider: config.provider,
          model: config.model,
          prompt: input.prompt,
          signal: controller.signal,
        });
        const saved = await saveGeneratedImageToMedia(image, app.path);

        return {
          fileName: saved.fileName,
          filePath: saved.filePath,
          appPath: app.path,
          appId: app.id,
          appName: app.name,
        };
      } catch (error) {
        if (controller.signal.aborted) {
          throw new DyadError(
            "Image generation was cancelled.",
            DyadErrorKind.UserCancelled,
          );
        }
        throw error;
      } finally {
        pendingRequests.delete(input.requestId);
      }
    },
  );

  createTypedHandler(
    imageGenerationContracts.cancelImageGeneration,
    async (_, input) => {
      const controller = pendingRequests.get(input.requestId);
      if (!controller) {
        return { cancelled: false };
      }
      controller.abort();
      pendingRequests.delete(input.requestId);
      return { cancelled: true };
    },
  );
}
