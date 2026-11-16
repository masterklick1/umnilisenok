import { useLanguage } from "@/contexts/LanguageContext";
interface UserWelcomeProps {
  name?: string;
}

export const UserWelcome = ({ name }: UserWelcomeProps) => {
  const { t } = useLanguage();
  return (
    <div className="relative flex items-center justify-center gap-3 p-4 rounded-3xl shadow-lg bg-gradient-to-r from-primary/15 via-card to-secondary/15 ring-1 ring-white/50 overflow-hidden">
      <span className="text-3xl hover-wiggle">👋</span>
      <div className="text-center">
        <div className="font-extrabold text-xl">
          {name ? (
            <>{t("Привет,", "Hi,")} <span className="text-gradient">{name}</span>{t("! Давай играть!", "! Let’s play!")}</>
          ) : (
            <>{t("Привет! Давай играть!", "Hi! Let’s play!")}</>
          )}
        </div>
      </div>
      <span className="text-3xl animate-bounce-gentle">🦊</span>
    </div>
  );
};
