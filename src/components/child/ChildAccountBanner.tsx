import { useLanguage } from "@/contexts/LanguageContext";

export function ChildAccountBanner() {
  const { t } = useLanguage();
  return (
    <div className="fixed bottom-24 left-0 right-0 flex justify-center px-4 pointer-events-none z-10">
      <div className="bg-card/95 backdrop-blur border border-primary/20 rounded-full px-4 py-2 shadow-md max-w-md text-center">
        <p className="text-xs text-muted-foreground">
          {t("📱 Это приложение ребёнка · родители смотрят со своего телефона", "📱 This is the child’s app. Parents can view activity on their phones.")}
        </p>
      </div>
    </div>
  );
}
