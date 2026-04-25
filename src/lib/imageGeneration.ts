export const IMAGE_GENERATION_PROVIDER_VALUES = [
  "openai",
  "openrouter",
  "google",
  "minimax",
  "xai",
] as const;

export type ImageGenerationProvider =
  (typeof IMAGE_GENERATION_PROVIDER_VALUES)[number];

export const DEFAULT_IMAGE_GENERATION_PROVIDER: ImageGenerationProvider =
  "openai";

export const DEFAULT_IMAGE_GENERATION_MODEL_BY_PROVIDER: Record<
  ImageGenerationProvider,
  string
> = {
  openai: "gpt-image-1.5",
  openrouter: "google/gemini-3.1-flash-image-preview",
  google: "gemini-3.1-flash-image-preview",
  minimax: "image-01",
  xai: "grok-imagine-image",
};

export const IMAGE_GENERATION_MODEL_OPTIONS: Record<
  ImageGenerationProvider,
  readonly string[]
> = {
  openai: ["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"],
  openrouter: [
    "google/gemini-3.1-flash-image-preview",
    "google/gemini-2.5-flash-image-preview",
  ],
  google: ["gemini-3.1-flash-image-preview", "gemini-2.5-flash-image"],
  minimax: ["image-01"],
  xai: ["grok-imagine-image"],
};

export const IMAGE_GENERATION_PROVIDER_LABELS: Record<
  ImageGenerationProvider,
  string
> = {
  openai: "OpenAI",
  openrouter: "OpenRouter",
  google: "Google",
  minimax: "MiniMax",
  xai: "xAI",
};
