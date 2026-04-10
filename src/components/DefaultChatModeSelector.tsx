import { useSettings } from "@/hooks/useSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChatMode } from "@/lib/schemas";
import { getEffectiveDefaultChatMode } from "@/lib/schemas";
import { useTranslation } from "react-i18next";

export function DefaultChatModeSelector() {
  const { settings, updateSettings, envVars } = useSettings();
  const { t } = useTranslation("settings");
  const { t: tChat } = useTranslation("chat");

  if (!settings) {
    return null;
  }

  const effectiveDefault = getEffectiveDefaultChatMode(settings, envVars, true);

  const handleDefaultChatModeChange = (value: ChatMode) => {
    updateSettings({ defaultChatMode: value });
  };

  const getModeDisplayName = (mode: ChatMode) => {
    switch (mode) {
      case "build":
        return tChat("chatMode.build");
      case "local-agent":
        return tChat("chatMode.agent");
      case "ask":
        return tChat("chatMode.ask");
      case "plan":
        return tChat("chatMode.plan");
      case "design":
        return tChat("chatMode.design");
      default:
        throw new Error(`Unknown chat mode: ${mode}`);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <label
          htmlFor="default-chat-mode"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t("workflow.defaultChatMode")}
        </label>
        <Select
          value={effectiveDefault}
          onValueChange={(v) => v && handleDefaultChatModeChange(v)}
        >
          <SelectTrigger className="w-40" id="default-chat-mode">
            <SelectValue placeholder={getModeDisplayName(effectiveDefault)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local-agent">
              <div className="flex flex-col items-start">
                <span className="font-medium">{tChat("chatMode.agent")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("workflow.agentDescription")}
                </span>
              </div>
            </SelectItem>
            <SelectItem value="build">
              <div className="flex flex-col items-start">
                <span className="font-medium">{tChat("chatMode.build")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("workflow.buildDescription")}
                </span>
              </div>
            </SelectItem>
            <SelectItem value="design">
              <div className="flex flex-col items-start">
                <span className="font-medium">{tChat("chatMode.design")}</span>
                <span className="text-xs text-muted-foreground">
                  {tChat("chatMode.designDescription")}
                </span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {t("workflow.defaultChatModeDescription")}
      </div>
    </div>
  );
}
