import { useAtom, useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
// @ts-ignore
import logo from "../../assets/logo.svg";
import { useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { ipc } from "@/ipc/types";
import { useSystemPlatform } from "@/hooks/useSystemPlatform";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatTabs } from "@/components/chat/ChatTabs";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { Wrench, Cog, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRunApp } from "@/hooks/useRunApp";
import { showError, showSuccess } from "@/lib/toast";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export const TitleBar = () => {
  const { t: tc } = useTranslation("common");
  const [selectedAppId] = useAtom(selectedAppIdAtom);
  const selectedChatId = useAtomValue(selectedChatIdAtom);
  const { apps } = useLoadApps();
  const { navigate } = useRouter();
  const platform = useSystemPlatform();
  const showWindowControls = platform !== null && platform !== "darwin";

  const selectedApp = apps.find((app) => app.id === selectedAppId);
  const displayText = selectedApp
    ? `${tc("titleBar.appPrefix")}: ${selectedApp.name}`
    : tc("titleBar.noAppSelected");

  const handleAppClick = () => {
    if (selectedApp) {
      navigate({ to: "/app-details", search: { appId: selectedApp.id } });
    }
  };

  return (
    <div className="@container z-11 w-full h-11 pt-3 bg-(--sidebar) absolute top-0 left-0 app-region-drag flex items-center">
      <div className={`${showWindowControls ? "pl-2" : "pl-18"}`}></div>

      <img src={logo} alt="Minerva Logo" className="w-6 h-6 mr-0.5 ml-2" />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              data-testid="title-bar-app-name-button"
              variant="outline"
              size="sm"
              className={`hidden @2xl:block no-app-region-drag text-xs max-w-38 truncate font-medium ${
                selectedApp ? "cursor-pointer" : ""
              }`}
              onClick={handleAppClick}
            />
          }
        >
          {displayText}
        </TooltipTrigger>
        <TooltipContent>
          {selectedApp ? selectedApp.name : tc("titleBar.noAppSelectedTooltip")}
        </TooltipContent>
      </Tooltip>

      <div className="flex-1 min-w-0 overflow-hidden no-app-region-drag">
        <ChatTabs selectedChatId={selectedChatId} />
      </div>

      <TitleBarActions />

      {showWindowControls && <WindowsControls />}
    </div>
  );
};

function WindowsControls() {
  const { t } = useTranslation("common");
  const { isDarkMode } = useTheme();

  return (
    <div className="ml-auto flex no-app-region-drag">
      <button
        className="w-10 h-10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onClick={() => ipc.system.minimizeWindow()}
        aria-label={t("titleBar.minimize")}
      >
        <svg
          width="12"
          height="1"
          viewBox="0 0 12 1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            width="12"
            height="1"
            fill={isDarkMode ? "#ffffff" : "#000000"}
          />
        </svg>
      </button>
      <button
        className="w-10 h-10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onClick={() => ipc.system.maximizeWindow()}
        aria-label={t("titleBar.maximize")}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="0.5"
            y="0.5"
            width="11"
            height="11"
            stroke={isDarkMode ? "#ffffff" : "#000000"}
          />
        </svg>
      </button>
      <button
        className="w-10 h-10 flex items-center justify-center hover:bg-red-500 transition-colors"
        onClick={() => ipc.system.closeWindow()}
        aria-label={t("close")}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1L11 11M1 11L11 1"
            stroke={isDarkMode ? "#ffffff" : "#000000"}
            strokeWidth="1.5"
          />
        </svg>
      </button>
    </div>
  );
}

function TitleBarActions() {
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation("common");
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const { restartApp, refreshAppIframe } = useRunApp();

  const onCleanRestart = useCallback(() => {
    restartApp({ removeNodeModules: true });
  }, [restartApp]);

  const useClearSessionData = () => {
    return useMutation({
      mutationFn: () => ipc.system.clearSessionData(),
      onSuccess: async () => {
        await refreshAppIframe();
        showSuccess(tc("titleBar.previewDataCleared"));
      },
      onError: (error) => {
        showError(
          tc("titleBar.errorClearingPreviewData", {
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      },
    });
  };

  const { mutate: clearSessionData } = useClearSessionData();

  const onClearSessionData = useCallback(() => {
    clearSessionData();
  }, [clearSessionData]);

  return (
    <div
      className="flex items-center gap-0.5 no-app-region-drag mr-2"
      style={{ visibility: selectedAppId ? "visible" : "hidden" }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          data-testid="preview-more-options-button"
          className="flex items-center justify-center w-8 h-8 rounded-md text-sm hover:bg-sidebar-accent transition-colors"
        >
          <Wrench size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={onCleanRestart}>
            <Cog size={16} />
            <div className="flex flex-col">
              <span>{t("preview.rebuild")}</span>
              <span className="text-xs text-muted-foreground">
                {t("preview.rebuildDescription")}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onClearSessionData}>
            <Trash2 size={16} />
            <div className="flex flex-col">
              <span>{t("preview.clearCache")}</span>
              <span className="text-xs text-muted-foreground">
                {t("preview.clearCacheDescription")}
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

