import { Info, KeyRound, Trash2, Clipboard } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AzureConfiguration } from "./AzureConfiguration";
import { VertexConfiguration } from "./VertexConfiguration";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserSettings } from "@/lib/schemas";
import { showError } from "@/lib/toast";
import { useTranslation } from "react-i18next";

// Helper function to mask ENV API keys (move or duplicate if needed elsewhere)
const maskEnvApiKey = (
  key: string | undefined,
  notSetLabel: string,
): string => {
  if (!key) return notSetLabel;
  if (key.length < 8) return "****";
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
};

interface ApiKeyConfigurationProps {
  provider: string;
  providerDisplayName: string;
  settings: UserSettings | null | undefined;
  envVars: Record<string, string | undefined>;
  envVarName?: string;
  isSaving: boolean;
  saveError: string | null;
  apiKeyInput: string;
  onApiKeyInputChange: (value: string) => void;
  onSaveKey: (value: string) => Promise<void>;
  onDeleteKey: () => Promise<void>;
  isDyad: boolean;
  updateSettings: (settings: Partial<UserSettings>) => Promise<UserSettings>;
}

export function ApiKeyConfiguration({
  provider,
  providerDisplayName,
  settings,
  envVars,
  envVarName,
  isSaving,
  saveError,
  apiKeyInput,
  onApiKeyInputChange,
  onSaveKey,
  onDeleteKey,
  isDyad,
  updateSettings,
}: ApiKeyConfigurationProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");

  // Special handling for Azure OpenAI which requires environment variables
  if (provider === "azure") {
    return (
      <AzureConfiguration
        settings={settings}
        envVars={envVars}
        updateSettings={updateSettings}
      />
    );
  }
  // Special handling for Google Vertex AI which uses service account credentials
  if (provider === "vertex") {
    return <VertexConfiguration />;
  }

  const envApiKey = envVarName ? envVars[envVarName] : undefined;
  const userApiKey = settings?.providerSettings?.[provider]?.apiKey?.value;

  const isValidUserKey =
    !!userApiKey &&
    !userApiKey.startsWith("Invalid Key") &&
    userApiKey !== "Not Set";
  const hasEnvKey = !!envApiKey;

  const activeKeySource = isValidUserKey
    ? "settings"
    : hasEnvKey
      ? "env"
      : "none";

  const defaultAccordionValue = [];
  if (isValidUserKey || !hasEnvKey) {
    defaultAccordionValue.push("settings-key");
  }
  if (!isDyad && hasEnvKey) {
    defaultAccordionValue.push("env-key");
  }

  return (
    <Accordion
      multiple
      className="w-full space-y-4"
      defaultValue={defaultAccordionValue}
    >
      <AccordionItem
        value="settings-key"
        className="border rounded-lg px-4 bg-(--background-lightest)"
      >
        <AccordionTrigger className="text-lg font-medium hover:no-underline cursor-pointer">
          {t("apiKey.fromSettings")}
        </AccordionTrigger>
        <AccordionContent className="pt-4 ">
          {isValidUserKey && (
            <Alert variant="default" className="mb-4">
              <KeyRound className="h-4 w-4" />
              <AlertTitle className="flex justify-between items-center">
                <span>{t("apiKey.currentKey")}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDeleteKey}
                  disabled={isSaving}
                  className="flex items-center gap-1 h-7 px-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {isSaving ? tc("deleting") : tc("delete")}
                </Button>
              </AlertTitle>
              <AlertDescription>
                <p className="font-mono text-sm">{userApiKey}</p>
                {activeKeySource === "settings" && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {t("apiKey.thisKeyActive")}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label
              htmlFor="apiKeyInput"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {isValidUserKey
                ? t("apiKey.updateKey", { name: providerDisplayName })
                : t("apiKey.setKey", { name: providerDisplayName })}
            </label>
            <div className="flex items-start space-x-2">
              <Input
                id="apiKeyInput"
                value={apiKeyInput}
                onChange={(e) => onApiKeyInputChange(e.target.value)}
                placeholder={t("apiKey.enterKey", {
                  name: providerDisplayName,
                })}
                className={`flex-grow ${saveError ? "border-red-500" : ""}`}
              />
              <Button
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      onSaveKey(text);
                    }
                  } catch (error) {
                    showError(t("apiKey.failedPasteClipboard"));
                    console.error("Failed to paste from clipboard", error);
                  }
                }}
                disabled={isSaving}
                variant="outline"
                size="icon"
                title={t("apiKey.pasteAndSave")}
                aria-label={t("apiKey.pasteAndSave")}
              >
                <Clipboard className="h-4 w-4" />
              </Button>

              <Button
                onClick={() => onSaveKey(apiKeyInput)}
                disabled={isSaving || !apiKeyInput}
              >
                {isSaving ? tc("saving") : t("apiKey.saveKey")}
              </Button>
            </div>
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("apiKey.overrideEnvVar")}
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      {!isDyad && envVarName && (
        <AccordionItem
          value="env-key"
          className="border rounded-lg px-4 bg-(--background-lightest)"
        >
          <AccordionTrigger className="text-lg font-medium hover:no-underline cursor-pointer">
            {t("apiKey.fromEnvVar")}
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            {hasEnvKey ? (
              <Alert variant="default">
                <KeyRound className="h-4 w-4" />
                <AlertTitle>
                  {t("apiKey.envVarKey", { name: envVarName })}
                </AlertTitle>
                <AlertDescription>
                  <p className="font-mono text-sm">
                    {maskEnvApiKey(envApiKey, tc("notSet"))}
                  </p>
                  {activeKeySource === "env" && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {t("apiKey.envVarActive")}
                    </p>
                  )}
                  {activeKeySource === "settings" && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {t("apiKey.envVarOverridden")}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertTitle>{t("apiKey.envVarNotSet")}</AlertTitle>
                <AlertDescription>
                  {t("apiKey.envVarNotSetDescription", { name: envVarName })}
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              {t("apiKey.envVarHelpText")}
            </p>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
