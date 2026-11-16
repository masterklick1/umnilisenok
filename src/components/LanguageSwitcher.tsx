import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div role="group" aria-label={t("Язык приложения", "App language")} className="flex justify-center gap-2">
      <Button size="sm" variant={language === "ru" ? "default" : "outline"} lang="ru"
        aria-pressed={language === "ru"} onClick={() => setLanguage("ru")}>
        Русский
      </Button>
      <Button size="sm" variant={language === "en" ? "default" : "outline"} lang="en"
        aria-pressed={language === "en"} onClick={() => setLanguage("en")}>
        English
      </Button>
    </div>
  );
}
