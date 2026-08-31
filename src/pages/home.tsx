import { useTranslation } from "react-i18next";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAtom, useSetAtom } from "jotai";
import { homeChatInputValueAtom } from "../atoms/chatAtoms";
import { ipc } from "@/ipc/types";
import { generateCuteAppName } from "@/lib/utils";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useSettings } from "@/hooks/useSettings";
import { SetupBanner } from "@/components/SetupBanner";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";
import { useState, useEffect, useCallback, useRef } from "react";
import { useStreamChat } from "@/hooks/useStreamChat";
import { HomeChatInput } from "@/components/chat/HomeChatInput";
import { usePostHog } from "posthog-js/react";
import { PrivacyBanner } from "@/components/TelemetryBanner";
import { INSPIRATION_PROMPTS } from "@/prompts/inspiration_prompts";
import { useAppVersion } from "@/hooks/useAppVersion";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { ImportAppButton } from "@/components/ImportAppButton";
import { showError } from "@/lib/toast";
import { invalidateAppQuery } from "@/hooks/useLoadApp";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { ForceCloseDialog } from "@/components/ForceCloseDialog";
import { useSelectChat } from "@/hooks/useSelectChat";

import type { FileAttachment } from "@/ipc/types";
import type { ListedApp } from "@/ipc/types/app";
import { NEON_TEMPLATE_IDS } from "@/shared/templates";
import { neonTemplateHook } from "@/client_logic/template_hook";
import { getEffectiveDefaultChatMode } from "@/lib/schemas";

const INSPIRATION_PROMPT_LABEL_KEYS: Record<string, string> = {
  "TODO list app": "inspiration.todoListApp",
  "Landing Page": "inspiration.landingPage",
  "Sign Up Form": "inspiration.signUpForm",
  "Mood Journal & Tracker": "inspiration.moodJournalTracker",
  "Interactive Story Game": "inspiration.interactiveStoryGame",
  "Recipe Finder & Meal Planner": "inspiration.recipeFinderMealPlanner",
  "Personal Finance Dashboard": "inspiration.personalFinanceDashboard",
  "Travel Memory Map": "inspiration.travelMemoryMap",
  "AI Writing Assistant": "inspiration.aiWritingAssistant",
  "Habit Streak Tracker": "inspiration.habitStreakTracker",
  "Newsletter Creator": "inspiration.newsletterCreator",
  "Music Discovery App": "inspiration.musicDiscoveryApp",
  "3D Portfolio Viewer": "inspiration.portfolio3dViewer",
  "AI Image Generator": "inspiration.aiImageGenerator",
  "Pomodoro Focus Timer": "inspiration.pomodoroFocusTimer",
  "Virtual Avatar Builder": "inspiration.virtualAvatarBuilder",
};

// Track whether we've already checked release notes this session (module-scoped
// so it persists across component unmount/remount cycles).
let hasCheckedReleaseNotes = false;

// Adding an export for attachments
export interface HomeSubmitOptions {
  attachments?: FileAttachment[];
  selectedApp?: ListedApp;
}

export default function HomePage() {
  const { t } = useTranslation("home");
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);
  const navigate = useNavigate();
  const search = useSearch({ from: "/" });
  const { refreshApps } = useLoadApps();
  const { settings, updateSettings, envVars } = useSettings();

  const setIsPreviewOpen = useSetAtom(isPreviewOpenAtom);
  const { selectChat } = useSelectChat();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"new" | "existing">("new");
  const [forceCloseDialogOpen, setForceCloseDialogOpen] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(undefined);
  const { streamMessage } = useStreamChat({ hasChatId: false });
  const posthog = usePostHog();
  const appVersion = useAppVersion();
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [releaseUrl, setReleaseUrl] = useState("");
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // Listen for force-close events
  useEffect(() => {
    const unsubscribe = ipc.events.system.onForceCloseDetected((data) => {
      setPerformanceData(data.performanceData);
      setForceCloseDialogOpen(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateLastVersionLaunched = async () => {
      if (
        hasCheckedReleaseNotes ||
        !appVersion ||
        !settings ||
        settings.lastShownReleaseNotesVersion === appVersion
      ) {
        return;
      }
      hasCheckedReleaseNotes = true;

      const shouldShowReleaseNotes = !!settings.lastShownReleaseNotesVersion;
      await updateSettings({
        lastShownReleaseNotesVersion: appVersion,
      });
      // It feels spammy to show release notes if it's
      // the users very first time.
      if (!shouldShowReleaseNotes) {
        return;
      }

      try {
        const result = await ipc.system.doesReleaseNoteExist({
          version: appVersion,
        });

        if (result.exists && result.url) {
          setReleaseUrl(result.url + "?hideHeader=true&theme=" + theme);
          setReleaseNotesOpen(true);
        }
      } catch (err) {
        console.warn(
          "Unable to check if release note exists for: " + appVersion,
          err,
        );
      }
    };
    updateLastVersionLaunched();
  }, [appVersion, settings, updateSettings, theme]);

  // Get the appId from search params
  const appId = search.appId ? Number(search.appId) : null;

  // State for random prompts
  const [randomPrompts, setRandomPrompts] = useState<
    typeof INSPIRATION_PROMPTS
  >([]);

  // Function to get random prompts
  const getRandomPrompts = useCallback(() => {
    const shuffled = [...INSPIRATION_PROMPTS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, []);

  // Initialize random prompts
  useEffect(() => {
    setRandomPrompts(getRandomPrompts());
  }, [getRandomPrompts]);

  const getInspirationLabel = useCallback(
    (label: string) => {
      const key = INSPIRATION_PROMPT_LABEL_KEYS[label];
      return key ? t(key as any) : label;
    },
    [t],
  );

  // Redirect to app details page if appId is present
  useEffect(() => {
    if (appId) {
      navigate({ to: "/app-details", search: { appId } });
    }
  }, [appId, navigate]);

  // Apply default chat mode when navigating to home page.
  const hasAppliedDefaultChatMode = useRef(false);
  useEffect(() => {
    if (settings && !hasAppliedDefaultChatMode.current) {
      hasAppliedDefaultChatMode.current = true;
      const effectiveDefaultMode = getEffectiveDefaultChatMode(
        settings,
        envVars,
        true,
      );
      if (settings.selectedChatMode !== effectiveDefaultMode) {
        updateSettings({ selectedChatMode: effectiveDefaultMode });
      }
    }
  }, [settings, updateSettings, envVars]);

  const handleSubmit = async (options?: HomeSubmitOptions) => {
    const attachments = options?.attachments || [];
    const selectedApp = options?.selectedApp;

    if (!inputValue.trim() && attachments.length === 0) return;

    try {
      setLoadingMode(selectedApp ? "existing" : "new");
      setIsLoading(true);

      let chatId: number;
      let appId: number;

      if (selectedApp) {
        // Existing app flow: create a new chat in the selected app
        chatId = await ipc.chat.createChat(selectedApp.id);
        appId = selectedApp.id;
      } else {
        // New app flow (default behavior)
        const result = await ipc.app.createApp({
          name: generateCuteAppName(),
        });
        chatId = result.chatId;
        appId = result.app.id;

        if (
          settings?.selectedTemplateId &&
          NEON_TEMPLATE_IDS.has(settings.selectedTemplateId)
        ) {
          await neonTemplateHook({
            appId: result.app.id,
            appName: result.app.name,
          });
        }

        // Apply selected theme to the new app (if one is set)
        if (settings?.selectedThemeId) {
          await ipc.template.setAppTheme({
            appId: result.app.id,
            themeId: settings.selectedThemeId || null,
          });
        }
      }

      // Stream the message with attachments
      streamMessage({
        prompt: inputValue,
        chatId,
        attachments,
      });
      await new Promise((resolve) =>
        setTimeout(resolve, settings?.isTestMode ? 0 : 2000),
      );

      setInputValue("");
      setIsPreviewOpen(false);
      await refreshApps();
      await invalidateAppQuery(queryClient, { appId });
      // Invalidate chats so ChatTabs picks up the new chat immediately.
      await queryClient.invalidateQueries({ queryKey: queryKeys.chats.all });
      posthog.capture("home:chat-submit", { existingApp: !!selectedApp });
      // Select newly created first chat so it appears first in tabs.
      selectChat({ chatId, appId });
    } catch (error) {
      console.error("Failed to create chat:", error);
      showError(
        t(selectedApp ? "failedCreateChat" : "failedCreateApp", {
          error: (error as any).toString(),
        }),
      );
      setIsLoading(false);
    }
  };

  // Loading overlay for app creation
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center max-w-3xl m-auto p-8">
        <div className="w-full flex flex-col items-center">
          {/* Loading Spinner */}
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute top-0 left-0 w-full h-full border-8 border-gray-200 dark:border-gray-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-8 border-t-primary rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">
            {loadingMode === "existing" ? t("startingChat") : t("buildingApp")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
            {loadingMode === "existing" ? (
              t("creatingNewChat")
            ) : (
              <>
                {t("settingUp")} <br />
                {t("mightTakeMoment")}
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Main Home Page Content
  return (
    <div className="relative flex h-full w-full overflow-y-auto">
      <ForceCloseDialog
        isOpen={forceCloseDialogOpen}
        onClose={() => setForceCloseDialogOpen(false)}
        performanceData={performanceData}
      />
      <div className="flex min-h-full w-full flex-col items-center px-8 py-10">
        <div className="w-full max-w-3xl">
          <SetupBanner />

          <div className="w-full">
            <h1 className="mb-8 text-center text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400">
              {t("setup.buildNewApp")}
            </h1>

            <div className="mb-4 flex items-center justify-center gap-4">
              <ImportAppButton className="flex-none px-0 pb-0" />
            </div>
            <HomeChatInput onSubmit={handleSubmit} />

            <div className="mt-2 flex flex-col gap-4">
              <div className="flex flex-wrap justify-center gap-4">
                {randomPrompts.map((item, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() =>
                      setInputValue(
                        t("buildMeA", {
                          label: getInspirationLabel(item.label),
                        }),
                      )
                    }
                    className="flex items-center gap-3 px-4 py-2 rounded-xl border border-gray-200
                           bg-white/50 backdrop-blur-sm
                           transition-all duration-200
                           hover:bg-white hover:shadow-md hover:border-gray-300
                           active:scale-[0.98]
                           dark:bg-gray-800/50 dark:border-gray-700
                           dark:hover:bg-gray-800 dark:hover:border-gray-600"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getInspirationLabel(item.label)}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setRandomPrompts(getRandomPrompts())}
                className="self-center flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200
                       bg-white/50 backdrop-blur-sm
                       transition-all duration-200
                       hover:bg-white hover:shadow-md hover:border-gray-300
                       active:scale-[0.98]
                       dark:bg-gray-800/50 dark:border-gray-700
                       dark:hover:bg-gray-800 dark:hover:border-gray-600"
              >
                <svg
                  className="w-5 h-5 text-gray-700 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("moreIdeas")}
                </span>
              </button>
            </div>
          </div>
        </div>
        <PrivacyBanner />
      </div>

      {/* Release Notes Dialog */}
      <Dialog open={releaseNotesOpen} onOpenChange={setReleaseNotesOpen}>
        <DialogContent className="max-w-4xl bg-(--docs-bg) pr-0 pt-4 pl-4 gap-1">
          <DialogHeader>
            <DialogTitle>{t("whatsNew", { version: appVersion })}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-10 top-2 focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={() =>
                window.open(
                  releaseUrl.replace("?hideHeader=true&theme=" + theme, ""),
                  "_blank",
                )
              }
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </DialogHeader>
          <div className="overflow-auto h-[70vh] flex flex-col ">
            {releaseUrl && (
              <div className="flex-1">
                <iframe
                  src={releaseUrl}
                  className="w-full h-full border-0 rounded-lg"
                  title={t("releaseNotesTitle", { version: appVersion })}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
