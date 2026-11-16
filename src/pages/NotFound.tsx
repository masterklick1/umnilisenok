import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const { t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("Страница не найдена", "Page not found")}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t("На главную", "Back to home")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
