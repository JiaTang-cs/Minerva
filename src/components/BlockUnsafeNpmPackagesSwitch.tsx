import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "react-i18next";

export function BlockUnsafeNpmPackagesSwitch() {
  const { t } = useTranslation("settings");
  const { settings, updateSettings } = useSettings();

  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <Switch
          id="block-unsafe-npm-packages"
          aria-label={t("experiments.blockUnsafeNpmPackages")}
          checked={settings?.blockUnsafeNpmPackages ?? true}
          onCheckedChange={(checked) => {
            updateSettings({
              blockUnsafeNpmPackages: checked,
            });
          }}
        />
        <Label htmlFor="block-unsafe-npm-packages">
          {t("experiments.blockUnsafeNpmPackages")}
        </Label>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {t("experiments.blockUnsafeNpmPackagesDescription")}
      </div>
    </div>
  );
}
