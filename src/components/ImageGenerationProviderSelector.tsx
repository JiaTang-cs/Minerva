import React from "react";
import { useSettings } from "@/hooks/useSettings";
import type { ImageGenerationProvider } from "@/lib/schemas";
import {
  DEFAULT_IMAGE_GENERATION_MODEL_BY_PROVIDER,
  IMAGE_GENERATION_PROVIDER_LABELS,
  IMAGE_GENERATION_PROVIDER_VALUES,
} from "@/lib/imageGeneration";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

export const ImageGenerationProviderSelector: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation("settings");

  const currentValue =
    settings?.imageGenerationProvider ?? IMAGE_GENERATION_PROVIDER_VALUES[0];

  const handleValueChange = (value: string | null) => {
    if (!value) return;
    const provider = value as ImageGenerationProvider;
    void updateSettings({
      imageGenerationProvider: provider,
      imageGenerationModel: DEFAULT_IMAGE_GENERATION_MODEL_BY_PROVIDER[provider],
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-4">
        <label
          htmlFor="image-generation-provider"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t("ai.imageGenerationProvider")}
        </label>
        <Select value={currentValue} onValueChange={handleValueChange}>
          <SelectTrigger className="w-[240px]" id="image-generation-provider">
            <SelectValue>
              {IMAGE_GENERATION_PROVIDER_LABELS[currentValue]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {IMAGE_GENERATION_PROVIDER_VALUES.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {IMAGE_GENERATION_PROVIDER_LABELS[provider]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {t("ai.imageGenerationProviderDescription")}
      </div>
    </div>
  );
};
