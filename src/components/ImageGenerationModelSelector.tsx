import React from "react";
import { useSettings } from "@/hooks/useSettings";
import {
  DEFAULT_IMAGE_GENERATION_MODEL_BY_PROVIDER,
  IMAGE_GENERATION_MODEL_OPTIONS,
} from "@/lib/imageGeneration";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

export const ImageGenerationModelSelector: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation("settings");

  const provider = settings?.imageGenerationProvider ?? "openai";
  const options = IMAGE_GENERATION_MODEL_OPTIONS[provider];
  const currentValue =
    settings?.imageGenerationModel ??
    DEFAULT_IMAGE_GENERATION_MODEL_BY_PROVIDER[provider];

  const handleValueChange = (value: string | null) => {
    if (!value) return;
    void updateSettings({ imageGenerationModel: value });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-4">
        <label
          htmlFor="image-generation-model"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t("ai.imageGenerationModel")}
        </label>
        <Select value={currentValue} onValueChange={handleValueChange}>
          <SelectTrigger className="w-[320px]" id="image-generation-model">
            <SelectValue>{currentValue}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {t("ai.imageGenerationModelDescription")}
      </div>
    </div>
  );
};
