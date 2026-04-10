import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { showError } from "@/lib/toast";
import { ipc } from "@/ipc/types";
import { useTranslation } from "react-i18next";

export function RuntimeModeSelector() {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation("settings");

  if (!settings) {
    return null;
  }

  const isDockerMode = settings.runtimeMode2 === "docker";
  const currentLabel = isDockerMode
    ? t("general.dockerRuntime")
    : t("general.hostRuntime");

  const handleRuntimeModeChange = async (value: "host" | "docker") => {
    try {
      await updateSettings({ runtimeMode2: value });
    } catch (error: any) {
      showError(t("general.runtimeModeUpdateFailed", { error: error.message }));
    }
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium" htmlFor="runtime-mode">
            {t("general.runtimeMode")}
          </Label>
          <Select
            value={settings.runtimeMode2 ?? "host"}
            onValueChange={(v) => v && handleRuntimeModeChange(v)}
          >
            <SelectTrigger className="w-48" id="runtime-mode">
              <SelectValue placeholder={currentLabel}>
                {currentLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="host">{t("general.hostRuntime")}</SelectItem>
              <SelectItem value="docker">
                {t("general.dockerRuntime")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t("general.runtimeModeDescription")}
        </div>
      </div>
      {isDockerMode && (
        <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
          Docker mode {t("general.dockerWarningPrefix")}{" "}
          <b>{t("general.dockerWarningExperimental")}</b>{" "}
          {t("general.dockerWarningBeforeLink")}{" "}
          <button
            type="button"
            className="underline font-medium cursor-pointer"
            onClick={() =>
              ipc.system.openExternalUrl(
                "https://www.docker.com/products/docker-desktop/",
              )
            }
          >
            {t("general.dockerDesktop")}
          </button>{" "}
          {t("general.dockerWarningAfterLink")}
        </div>
      )}
    </div>
  );
}
