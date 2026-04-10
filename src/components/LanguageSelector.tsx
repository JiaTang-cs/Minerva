import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/hooks/useSettings";
import { Language, LanguageSchema } from "@/lib/schemas";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_LANGUAGE: Language = "en";

const LANGUAGE_OPTIONS: { value: Language; nativeLabel: string }[] = [
  { value: "en", nativeLabel: "English" },
  { value: "zh-CN", nativeLabel: "简体中文" },
  { value: "pt-BR", nativeLabel: "Português (Brasil)" },
];

export function LanguageSelector() {
  const { t } = useTranslation("settings");
  const { settings, updateSettings } = useSettings();

  const currentLanguage: Language = useMemo(() => {
    const parsed = LanguageSchema.safeParse(settings?.language);
    return parsed.success ? parsed.data : DEFAULT_LANGUAGE;
  }, [settings?.language]);

  const currentLanguageLabel =
    LANGUAGE_OPTIONS.find((lang) => lang.value === currentLanguage)
      ?.nativeLabel ?? currentLanguage;

  const handleChange = async (value: Language | null) => {
    if (!value) return;
    try {
      await updateSettings({ language: value });
    } catch (error) {
      console.error("Failed to update language setting:", error);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="language">{t("general.language")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("general.languageDescription")}
        </p>
      </div>
      <Select value={currentLanguage} onValueChange={handleChange}>
        <SelectTrigger id="language" className="w-[220px]">
          <SelectValue placeholder={currentLanguageLabel}>
            {currentLanguageLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LANGUAGE_OPTIONS.map((lang) => (
            <SelectItem key={lang.value} value={lang.value}>
              {lang.nativeLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
