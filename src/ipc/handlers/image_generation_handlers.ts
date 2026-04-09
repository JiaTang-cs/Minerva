import { createTypedHandler } from "./base";
import { imageGenerationContracts } from "../types/image_generation";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

export function registerImageGenerationHandlers() {
  createTypedHandler(imageGenerationContracts.generateImage, async () => {
    throw new DyadError(
      "Image generation is currently unavailable.",
      DyadErrorKind.Precondition,
    );
  });

  createTypedHandler(
    imageGenerationContracts.cancelImageGeneration,
    async () => ({ cancelled: false }),
  );
}
