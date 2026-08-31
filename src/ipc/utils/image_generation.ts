import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import log from "electron-log";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type { UserSettings, ImageGenerationProvider } from "@/lib/schemas";
import {
  DEFAULT_IMAGE_GENERATION_MODEL_BY_PROVIDER,
  DEFAULT_IMAGE_GENERATION_PROVIDER,
} from "@/lib/imageGeneration";
import { INTERNAL_MEDIA_DIR_NAME } from "./media_path_utils";
import { getEnvVar } from "./read_env";

const logger = log.scope("image_generation");

export type NormalizedGeneratedImage = {
  url?: string | null;
  b64_json?: string | null;
  revised_prompt?: string | null;
};

type GenerateImageRequest = {
  provider: ImageGenerationProvider;
  model: string;
  prompt: string;
  signal?: AbortSignal;
};

function getImageGenerationApiKey(
  settings: UserSettings,
  provider: ImageGenerationProvider,
): string | undefined {
  const settingsKey =
    settings.providerSettings?.[provider]?.apiKey?.value?.trim();
  if (settingsKey) return settingsKey;

  switch (provider) {
    case "openai":
      return getEnvVar("OPENAI_API_KEY")?.trim();
    case "openrouter":
      return getEnvVar("OPENROUTER_API_KEY")?.trim();
    case "google":
      return (
        getEnvVar("GEMINI_API_KEY")?.trim() ||
        getEnvVar("GOOGLE_API_KEY")?.trim()
      );
    case "minimax":
      return getEnvVar("MINIMAX_API_KEY")?.trim();
    case "xai":
      return getEnvVar("XAI_API_KEY")?.trim();
    default:
      return undefined;
  }
}

export function resolveImageGenerationConfig(settings: UserSettings): {
  provider: ImageGenerationProvider;
  model: string;
  apiKey: string;
} {
  const provider =
    settings.imageGenerationProvider ?? DEFAULT_IMAGE_GENERATION_PROVIDER;
  const model =
    settings.imageGenerationModel ??
    DEFAULT_IMAGE_GENERATION_MODEL_BY_PROVIDER[provider];
  const apiKey = getImageGenerationApiKey(settings, provider);

  if (!apiKey) {
    throw new DyadError(
      `Image generation API key is not configured for ${provider}.`,
      DyadErrorKind.Precondition,
    );
  }

  return { provider, model, apiKey };
}

function extractBase64FromDataUrl(dataUrl: string): string {
  const parts = dataUrl.split(",", 2);
  if (parts.length !== 2 || !parts[0].includes(";base64")) {
    throw new DyadError(
      "Image generation returned an unsupported data URL.",
      DyadErrorKind.External,
    );
  }
  return parts[1];
}

async function parseOpenAiLikeResponse(response: Response) {
  const data = (await response.json()) as {
    data?: NormalizedGeneratedImage[];
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new DyadError(
      data.error?.message ||
        `Image generation failed with status ${response.status}.`,
      DyadErrorKind.External,
    );
  }

  const image = data.data?.[0];
  if (!image) {
    throw new DyadError(
      "Image generation returned no image data.",
      DyadErrorKind.External,
    );
  }

  return image;
}

async function generateWithOpenAI({
  apiKey,
  model,
  prompt,
  signal,
}: GenerateImageRequest & { apiKey: string }) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      response_format: "b64_json",
      n: 1,
      size: "1024x1024",
    }),
    signal,
  });

  return parseOpenAiLikeResponse(response);
}

async function generateWithXai({
  apiKey,
  model,
  prompt,
  signal,
}: GenerateImageRequest & { apiKey: string }) {
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      response_format: "b64_json",
      n: 1,
    }),
    signal,
  });

  return parseOpenAiLikeResponse(response);
}

async function generateWithGoogle({
  apiKey,
  model,
  prompt,
  signal,
}: GenerateImageRequest & { apiKey: string }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal,
    },
  );

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          inlineData?: { data?: string };
          inline_data?: { data?: string };
        }>;
      };
    }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new DyadError(
      data.error?.message ||
        `Image generation failed with status ${response.status}.`,
      DyadErrorKind.External,
    );
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(
    (part) => part.inlineData?.data || part.inline_data?.data,
  );
  if (!imagePart) {
    throw new DyadError(
      "Google image generation returned no image data.",
      DyadErrorKind.External,
    );
  }

  return {
    b64_json: imagePart.inlineData?.data ?? imagePart.inline_data?.data,
    revised_prompt: parts.find((part) => part.text)?.text ?? null,
  } satisfies NormalizedGeneratedImage;
}

async function generateWithOpenRouter({
  apiKey,
  model,
  prompt,
  signal,
}: GenerateImageRequest & { apiKey: string }) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
        stream: false,
      }),
      signal,
    },
  );

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
        images?: Array<{
          image_url?: { url?: string };
          imageUrl?: { url?: string };
        }>;
      };
    }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new DyadError(
      data.error?.message ||
        `Image generation failed with status ${response.status}.`,
      DyadErrorKind.External,
    );
  }

  const imageUrl =
    data.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
    data.choices?.[0]?.message?.images?.[0]?.imageUrl?.url;

  if (!imageUrl) {
    throw new DyadError(
      "OpenRouter image generation returned no image data.",
      DyadErrorKind.External,
    );
  }

  return {
    b64_json: imageUrl.startsWith("data:")
      ? extractBase64FromDataUrl(imageUrl)
      : null,
    url: imageUrl.startsWith("data:") ? null : imageUrl,
    revised_prompt: data.choices?.[0]?.message?.content ?? null,
  } satisfies NormalizedGeneratedImage;
}

async function generateWithMiniMax({
  apiKey,
  model,
  prompt,
  signal,
}: GenerateImageRequest & { apiKey: string }) {
  const response = await fetch("https://api.minimax.io/v1/image_generation", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      response_format: "base64",
      n: 1,
      prompt_optimizer: true,
      aspect_ratio: "1:1",
    }),
    signal,
  });

  const data = (await response.json()) as {
    data?: {
      image_base64?: string[];
      image_urls?: string[];
    };
    base_resp?: { status_msg?: string };
    message?: string;
  };

  if (!response.ok) {
    throw new DyadError(
      data.base_resp?.status_msg ||
        data.message ||
        `Image generation failed with status ${response.status}.`,
      DyadErrorKind.External,
    );
  }

  const b64 = data.data?.image_base64?.[0];
  const url = data.data?.image_urls?.[0];
  if (!b64 && !url) {
    throw new DyadError(
      "MiniMax image generation returned no image data.",
      DyadErrorKind.External,
    );
  }

  return {
    b64_json: b64 ?? null,
    url: url ?? null,
  } satisfies NormalizedGeneratedImage;
}

export async function generateImageWithProvider(
  settings: UserSettings,
  request: GenerateImageRequest,
): Promise<NormalizedGeneratedImage> {
  const apiKey = getImageGenerationApiKey(settings, request.provider);
  if (!apiKey) {
    throw new DyadError(
      `Image generation API key is not configured for ${request.provider}.`,
      DyadErrorKind.Precondition,
    );
  }

  logger.info(
    `Generating image with provider=${request.provider} model=${request.model}`,
  );

  switch (request.provider) {
    case "openai":
      return generateWithOpenAI({ ...request, apiKey });
    case "openrouter":
      return generateWithOpenRouter({ ...request, apiKey });
    case "google":
      return generateWithGoogle({ ...request, apiKey });
    case "minimax":
      return generateWithMiniMax({ ...request, apiKey });
    case "xai":
      return generateWithXai({ ...request, apiKey });
  }
}

export async function saveGeneratedImageToMedia(
  image: NormalizedGeneratedImage,
  appPath: string,
): Promise<{
  fileName: string;
  filePath: string;
  relativePath: string;
}> {
  const mediaDir = path.join(appPath, INTERNAL_MEDIA_DIR_NAME);
  await fs.mkdir(mediaDir, { recursive: true });

  const fileName = `generated-${Date.now()}-${crypto.randomBytes(8).toString("hex")}.png`;
  const filePath = path.join(mediaDir, fileName);
  const relativePath = path.join(INTERNAL_MEDIA_DIR_NAME, fileName);

  if (image.b64_json) {
    await fs.writeFile(filePath, Buffer.from(image.b64_json, "base64"));
    return { fileName, filePath, relativePath };
  }

  if (!image.url) {
    throw new DyadError(
      "Image generation returned no image data.",
      DyadErrorKind.External,
    );
  }

  const downloadResponse = await fetch(image.url);
  if (!downloadResponse.ok) {
    throw new DyadError(
      `Failed to download generated image: ${downloadResponse.status}`,
      DyadErrorKind.External,
    );
  }

  const arrayBuffer = await downloadResponse.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));
  return { fileName, filePath, relativePath };
}
