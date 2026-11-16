import { contentLabel } from "@/lib/content-labels";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

export type AppLanguage = "ru" | "en";
export type Translate = (russian: string, english: string) => string;

const languageKey = "settings.appLanguage";
const LanguageContext = createContext<{
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: Translate;
  label: (text: string) => string;
} | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    try {
      return window.localStorage.getItem(languageKey) === "en" ? "en" : "ru";
    } catch {
      return "ru";
    }
  });

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "en" ? "🦊 Clever Little Fox – Learning and parental controls" : "🦊 Умный Лисёнок - Обучающее приложение для детей и Контроль";
    try {
      window.localStorage.setItem(languageKey, language);
    } catch {
      /* Keep the selection in memory when storage is unavailable. */
    }
  }, [language]);

  const t = useCallback<Translate>((russian, english) => language === "en" ? english : russian, [language]);
  const label = useCallback((text: string) => contentLabel(text, language), [language]);
  const value = useMemo(() => ({ language, setLanguage, t, label }), [language, t, label]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage requires LanguageProvider");
  return value;
}
