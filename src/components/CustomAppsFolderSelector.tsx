import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/lib/toast";
import { ipc } from "@/ipc/types";
import { FolderOpen, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

export function CustomAppsFolderSelector() {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const [isSelectingPath, setIsSelectingPath] = useState(false);
  const [customAppsFolder, setCustomAppsFolder] = useState<string>(
    tc("loading"),
  );
  const [isPathAvailable, setIsPathAvailable] = useState(true);
  const [isPathDefault, setIsPathDefault] = useState(true);

  useEffect(() => {
    fetchCustomAppsFolder();
  }, []);

  const handleSelectCustomAppsFolder = async () => {
    setIsSelectingPath(true);
    try {
      const result = await ipc.system.selectCustomAppsFolder();
      if (result.path) {
        await ipc.system.setCustomAppsFolder(result.path);
        await fetchCustomAppsFolder();
        showSuccess(t("general.customAppsFolderUpdated"));
      } else if (result.path === null && result.canceled === false) {
        showError(t("general.customAppsFolderInvalid"));
      }
    } catch (error: any) {
      showError(
        t("general.customAppsFolderSetFailed", { error: error.message }),
      );
    } finally {
      setIsSelectingPath(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      await ipc.system.setCustomAppsFolder(null);
      await fetchCustomAppsFolder();
      showSuccess(t("general.customAppsFolderReset"));
    } catch (error: any) {
      showError(
        t("general.customAppsFolderResetFailed", { error: error.message }),
      );
    }
  };

  const fetchCustomAppsFolder = async () => {
    try {
      const { path, isPathAvailable, isPathDefault } =
        await ipc.system.getCustomAppsFolder();
      setCustomAppsFolder(path);
      setIsPathAvailable(isPathAvailable);
      setIsPathDefault(isPathDefault);
    } catch (error: any) {
      showError(
        t("general.customAppsFolderFetchFailed", { error: error.message }),
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          <Label className="text-sm font-medium">
            {t("general.customAppsFolder")}
          </Label>

          <Button
            onClick={handleSelectCustomAppsFolder}
            disabled={isSelectingPath}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            data-testid="customize-apps-folder-button"
          >
            <FolderOpen className="w-4 h-4" />
            {isSelectingPath
              ? t("general.selecting")
              : t("general.selectFolder")}
          </Button>

          {!isPathDefault && (
            <Button
              onClick={handleResetToDefault}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t("general.resetToDefault")}
            </Button>
          )}
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {isPathDefault
                    ? t("general.defaultFolder")
                    : t("general.customFolder")}
                </span>
              </div>
              <p
                className={`text-sm font-mono ${isPathAvailable ? "text-gray-700 dark:text-gray-300" : "text-red-800 dark:text-red-400"} break-all max-h-32 overflow-y-auto`}
              >
                {customAppsFolder}
              </p>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>
            {isPathAvailable
              ? t("general.customAppsFolderDescription")
              : t("general.customAppsFolderUnavailable")}
          </p>
        </div>
      </div>
    </div>
  );
}
