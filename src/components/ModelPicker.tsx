import { type LargeLanguageModel } from "@/lib/schemas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { useLocalModels } from "@/hooks/useLocalModels";
import { useLocalLMSModels } from "@/hooks/useLMStudioModels";
import { useLanguageModelsByProviders } from "@/hooks/useLanguageModelsByProviders";
import { LocalModel } from "@/ipc/types";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";
import { useSettings } from "@/hooks/useSettings";
import { PriceBadge } from "@/components/PriceBadge";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useTranslation } from "react-i18next";

export function ModelPicker() {
  const { t } = useTranslation("chat");
  const { t: tc } = useTranslation("common");
  const { settings, updateSettings } = useSettings();
  const queryClient = useQueryClient();
  const onModelSelect = (model: LargeLanguageModel) => {
    updateSettings({ selectedModel: model });
    // Invalidate token count when model changes since different models have different context windows
    // (technically they have different tokenizers, but we don't keep track of that).
    queryClient.invalidateQueries({ queryKey: queryKeys.tokenCount.all });
  };

  const [open, setOpen] = useState(false);

  // Cloud models from providers
  const { data: modelsByProviders, isLoading: modelsByProvidersLoading } =
    useLanguageModelsByProviders();

  const { data: providers, isLoading: providersLoading } =
    useLanguageModelProviders();

  const loading = modelsByProvidersLoading || providersLoading;
  // Ollama Models Hook
  const {
    models: ollamaModels,
    loading: ollamaLoading,
    error: ollamaError,
    loadModels: loadOllamaModels,
  } = useLocalModels();

  // LM Studio Models Hook
  const {
    models: lmStudioModels,
    loading: lmStudioLoading,
    error: lmStudioError,
    loadModels: loadLMStudioModels,
  } = useLocalLMSModels();

  // Load models when the dropdown opens
  useEffect(() => {
    if (open) {
      loadOllamaModels();
      loadLMStudioModels();
    }
  }, [open, loadOllamaModels, loadLMStudioModels]);

  const localizeModelDisplayName = (displayName: string) => {
    switch (displayName) {
      case "Auto":
        return t("modelPicker.auto");
      case "Free (OpenRouter)":
        return t("modelPicker.freeOpenRouter");
      case "Turbo":
        return t("modelPicker.turbo");
      case "Super Value":
        return t("modelPicker.superValue");
      default:
        return displayName;
    }
  };

  const localizeModelTag = (tag: string) => {
    switch (tag) {
      case "Default":
        return t("modelPicker.defaultTag");
      case "Fast":
        return t("modelPicker.fastTag");
      case "Budget":
        return t("modelPicker.budgetTag");
      default:
        return tag;
    }
  };

  // Get display name for the selected model
  const getModelDisplayName = () => {
    if (selectedModel.provider === "ollama") {
      return (
        ollamaModels.find(
          (model: LocalModel) => model.modelName === selectedModel.name,
        )?.displayName || selectedModel.name
      );
    }
    if (selectedModel.provider === "lmstudio") {
      return (
        lmStudioModels.find(
          (model: LocalModel) => model.modelName === selectedModel.name,
        )?.displayName || selectedModel.name // Fallback to path if not found
      );
    }

    // For cloud models, look up in the modelsByProviders data
    if (modelsByProviders && modelsByProviders[selectedModel.provider]) {
      const customFoundModel = modelsByProviders[selectedModel.provider].find(
        (model) =>
          model.type === "custom" && model.id === selectedModel.customModelId,
      );
      if (customFoundModel) {
        return localizeModelDisplayName(customFoundModel.displayName);
      }
      const foundModel = modelsByProviders[selectedModel.provider].find(
        (model) => model.apiName === selectedModel.name,
      );
      if (foundModel) {
        return localizeModelDisplayName(foundModel.displayName);
      }
    }

    // Fallback if not found
    return selectedModel.name;
  };

  // Get auto provider models (if any)
  const autoModels =
    !loading && modelsByProviders && modelsByProviders["auto"]
      ? modelsByProviders["auto"]
      : [];

  // Determine availability of local models
  const hasOllamaModels =
    !ollamaLoading && !ollamaError && ollamaModels.length > 0;
  const hasLMStudioModels =
    !lmStudioLoading && !lmStudioError && lmStudioModels.length > 0;

  if (!settings) {
    return null;
  }
  const selectedModel = settings?.selectedModel;
  const modelDisplayName = getModelDisplayName();
  // Split providers into primary and secondary groups (excluding auto)
  const providerEntries =
    !loading && modelsByProviders
      ? Object.entries(modelsByProviders).filter(
          ([providerId]) => providerId !== "auto",
        )
      : [];
  const primaryProviders = providerEntries.filter(([providerId, models]) => {
    if (models.length === 0) return false;
    const provider = providers?.find((p) => p.id === providerId);
    return !(provider && provider.secondary);
  });
  const secondaryProviders = providerEntries.filter(([providerId, models]) => {
    if (models.length === 0) return false;
    const provider = providers?.find((p) => p.id === providerId);
    return !!(provider && provider.secondary);
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border-none bg-transparent shadow-none text-foreground/80 hover:text-foreground hover:bg-muted/60 h-7 max-w-[130px] px-2 gap-1.5 cursor-pointer"
        data-testid="model-picker"
        title={modelDisplayName}
      >
        <span className="truncate">
          {modelDisplayName === t("modelPicker.auto") && (
            <>
              <span className="text-xs text-muted-foreground/70">
                {t("modelPicker.modelLabel")}
              </span>{" "}
            </>
          )}
          {modelDisplayName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>{t("modelPicker.cloudModels")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="text-xs text-center py-2 text-muted-foreground">
            {t("modelPicker.loadingModels")}
          </div>
        ) : !modelsByProviders ||
          Object.keys(modelsByProviders).length === 0 ? (
          <div className="text-xs text-center py-2 text-muted-foreground">
            {t("modelPicker.noCloudModels")}
          </div>
        ) : (
          /* Cloud models loaded */
          <>
            {/* Auto models at top level if any */}
            {autoModels.length > 0 && (
              <>
                {autoModels.map((model) => (
                  <DropdownMenuItem
                    key={`auto-${model.apiName}`}
                    title={model.description}
                    className={
                      selectedModel.provider === "auto" &&
                      selectedModel.name === model.apiName
                        ? "bg-secondary"
                        : ""
                    }
                    onClick={() => {
                      onModelSelect({
                        name: model.apiName,
                        provider: "auto",
                      });
                      setOpen(false);
                    }}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="flex flex-col items-start">
                        <span>
                          {localizeModelDisplayName(model.displayName)}
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {model.tag && (
                          <span
                            className={cn(
                              "text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium",
                              model.tagColor,
                            )}
                          >
                            {localizeModelTag(model.tag)}
                          </span>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
                {Object.keys(modelsByProviders).length > 1 && (
                  <DropdownMenuSeparator />
                )}
              </>
            )}

            {/* Primary providers as submenus */}
            {primaryProviders.map(([providerId, models]) => {
              const provider = providers?.find((p) => p.id === providerId);
              const providerDisplayName =
                provider?.id === "auto"
                  ? t("modelPicker.dyadTurbo")
                  : (provider?.name ?? providerId);
              return (
                <DropdownMenuSub key={providerId}>
                  <DropdownMenuSubTrigger className="w-full font-normal">
                    <div className="flex flex-col items-start w-full">
                      <div className="flex items-center gap-2">
                        <span>{providerDisplayName}</span>
                        {provider?.type === "custom" && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                            {tc("custom")}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("modelPicker.modelCount", { count: models.length })}
                      </span>
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-56 max-h-100 overflow-y-auto">
                    <DropdownMenuLabel>
                      {t("modelPicker.providerModels", {
                        name: providerDisplayName,
                      })}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {models.map((model) => (
                      <DropdownMenuItem
                        key={`${providerId}-${model.apiName}`}
                        title={model.description}
                        className={
                          selectedModel.provider === providerId &&
                          selectedModel.name === model.apiName
                            ? "bg-secondary"
                            : ""
                        }
                        onClick={() => {
                          const customModelId =
                            model.type === "custom" ? model.id : undefined;
                          onModelSelect({
                            name: model.apiName,
                            provider: providerId,
                            customModelId,
                          });
                          setOpen(false);
                        }}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span>
                            {localizeModelDisplayName(model.displayName)}
                          </span>
                          <PriceBadge dollarSigns={model.dollarSigns} />
                          {model.tag && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                              {localizeModelTag(model.tag)}
                            </span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })}

            {/* Secondary providers grouped under Other AI providers */}
            {secondaryProviders.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="w-full font-normal">
                  <div className="flex flex-col items-start">
                    <span>{t("modelPicker.otherProviders")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("modelPicker.providerCount", {
                        count: secondaryProviders.length,
                      })}
                    </span>
                  </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuLabel>
                    {t("modelPicker.otherProviders")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {secondaryProviders.map(([providerId, models]) => {
                    const provider = providers?.find(
                      (p) => p.id === providerId,
                    );
                    return (
                      <DropdownMenuSub key={providerId}>
                        <DropdownMenuSubTrigger className="w-full font-normal">
                          <div className="flex flex-col items-start w-full">
                            <div className="flex items-center gap-2">
                              <span>{provider?.name ?? providerId}</span>
                              {provider?.type === "custom" && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                                  {tc("custom")}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {t("modelPicker.modelCount", {
                                count: models.length,
                              })}
                            </span>
                          </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56">
                          <DropdownMenuLabel>
                            {t("modelPicker.providerModels", {
                              name: provider?.name ?? providerId,
                            })}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {models.map((model) => (
                            <DropdownMenuItem
                              key={`${providerId}-${model.apiName}`}
                              title={model.description}
                              className={
                                selectedModel.provider === providerId &&
                                selectedModel.name === model.apiName
                                  ? "bg-secondary"
                                  : ""
                              }
                              onClick={() => {
                                const customModelId =
                                  model.type === "custom"
                                    ? model.id
                                    : undefined;
                                onModelSelect({
                                  name: model.apiName,
                                  provider: providerId,
                                  customModelId,
                                });
                                setOpen(false);
                              }}
                            >
                              <div className="flex justify-between items-start w-full">
                                <span>
                                  {localizeModelDisplayName(model.displayName)}
                                </span>
                                {model.tag && (
                                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                    {localizeModelTag(model.tag)}
                                  </span>
                                )}
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </>
        )}

        <DropdownMenuSeparator />
        {/* Local Models Parent SubMenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="w-full font-normal">
            <div className="flex flex-col items-start">
              <span>{t("modelPicker.localModels")}</span>
              <span className="text-xs text-muted-foreground">
                {t("modelPicker.localModelsDescription")}
              </span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            {/* Ollama Models SubMenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                disabled={ollamaLoading && !hasOllamaModels} // Disable if loading and no models yet
                className="w-full font-normal"
              >
                <div className="flex flex-col items-start">
                  <span>{t("modelPicker.ollama")}</span>
                  {ollamaLoading ? (
                    <span className="text-xs text-muted-foreground">
                      {t("modelPicker.loading")}
                    </span>
                  ) : ollamaError ? (
                    <span className="text-xs text-red-500">
                      {t("modelPicker.errorLoading")}
                    </span>
                  ) : !hasOllamaModels ? (
                    <span className="text-xs text-muted-foreground">
                      {t("modelPicker.noneAvailable")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("modelPicker.modelCount", {
                        count: ollamaModels.length,
                      })}
                    </span>
                  )}
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56 max-h-100 overflow-y-auto">
                <DropdownMenuLabel>
                  {t("modelPicker.ollamaModels")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {ollamaLoading && ollamaModels.length === 0 ? ( // Show loading only if no models are loaded yet
                  <div className="text-xs text-center py-2 text-muted-foreground">
                    {t("modelPicker.loadingModels")}
                  </div>
                ) : ollamaError ? (
                  <div className="px-2 py-1.5 text-sm text-red-600">
                    <div className="flex flex-col">
                      <span>{t("modelPicker.errorLoadingModels")}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("modelPicker.isOllamaRunning")}
                      </span>
                    </div>
                  </div>
                ) : !hasOllamaModels ? (
                  <div className="px-2 py-1.5 text-sm">
                    <div className="flex flex-col">
                      <span>{t("modelPicker.noLocalModels")}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("modelPicker.ensureOllamaRunning")}
                      </span>
                    </div>
                  </div>
                ) : (
                  ollamaModels.map((model: LocalModel) => (
                    <DropdownMenuItem
                      key={`ollama-${model.modelName}`}
                      className={
                        selectedModel.provider === "ollama" &&
                        selectedModel.name === model.modelName
                          ? "bg-secondary"
                          : ""
                      }
                      onClick={() => {
                        onModelSelect({
                          name: model.modelName,
                          provider: "ollama",
                        });
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span>{model.displayName}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {model.modelName}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* LM Studio Models SubMenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                disabled={lmStudioLoading && !hasLMStudioModels} // Disable if loading and no models yet
                className="w-full font-normal"
              >
                <div className="flex flex-col items-start">
                  <span>{t("modelPicker.lmStudio")}</span>
                  {lmStudioLoading ? (
                    <span className="text-xs text-muted-foreground">
                      {t("modelPicker.loading")}
                    </span>
                  ) : lmStudioError ? (
                    <span className="text-xs text-red-500">
                      {t("modelPicker.errorLoading")}
                    </span>
                  ) : !hasLMStudioModels ? (
                    <span className="text-xs text-muted-foreground">
                      {t("modelPicker.noneAvailable")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("modelPicker.modelCount", {
                        count: lmStudioModels.length,
                      })}
                    </span>
                  )}
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56 max-h-100 overflow-y-auto">
                <DropdownMenuLabel>
                  {t("modelPicker.lmStudioModels")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {lmStudioLoading && lmStudioModels.length === 0 ? ( // Show loading only if no models are loaded yet
                  <div className="text-xs text-center py-2 text-muted-foreground">
                    {t("modelPicker.loadingModels")}
                  </div>
                ) : lmStudioError ? (
                  <div className="px-2 py-1.5 text-sm text-red-600">
                    <div className="flex flex-col">
                      <span>{t("modelPicker.errorLoadingModels")}</span>
                      <span className="text-xs text-muted-foreground">
                        {lmStudioError.message} {/* Display specific error */}
                      </span>
                    </div>
                  </div>
                ) : !hasLMStudioModels ? (
                  <div className="px-2 py-1.5 text-sm">
                    <div className="flex flex-col">
                      <span>{t("modelPicker.noLoadedModels")}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("modelPicker.ensureLMStudioRunning")}
                      </span>
                    </div>
                  </div>
                ) : (
                  lmStudioModels.map((model: LocalModel) => (
                    <DropdownMenuItem
                      key={`lmstudio-${model.modelName}`}
                      className={
                        selectedModel.provider === "lmstudio" &&
                        selectedModel.name === model.modelName
                          ? "bg-secondary"
                          : ""
                      }
                      onClick={() => {
                        onModelSelect({
                          name: model.modelName,
                          provider: "lmstudio",
                        });
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        {/* Display the user-friendly name */}
                        <span>{model.displayName}</span>
                        {/* Show the path as secondary info */}
                        <span className="text-xs text-muted-foreground truncate">
                          {model.modelName}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
