import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true);
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("Пароль должен быть минимум 6 символов", "Use at least 6 characters for your password"));
      return;
    }
    if (password !== confirm) {
      setError(t("Пароли не совпадают", "The passwords don’t match"));
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      const msg = updateError.message?.toLowerCase() ?? "";
      if (msg.includes("weak") || msg.includes("pwned") || msg.includes("known")) {
        setError(t("Этот пароль слишком простой. Придумайте другой.", "This password is too easy to guess. Choose another one."));
      } else {
        setError(t("Не удалось сменить пароль. Попробуйте ещё раз.", "We couldn’t change your password. Try again."));
      }
      return;
    }

    setDone(true);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-bounce">🦊</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">{done ? "✅" : "🔒"}</div>
          <CardTitle className="text-2xl">
            {done ? t("Пароль изменён", "Password changed") : t("Новый пароль", "New password")}
          </CardTitle>
          <CardDescription>
            {done
              ? t("Теперь вы можете войти с новым паролем", "You can now sign in with your new password")
              : hasSession
                ? t("Придумайте новый пароль для входа", "Choose a new password")
                : t("Ссылка устарела или уже использована", "This link has expired or was already used")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {done ? (
            <Button className="w-full" onClick={() => navigate("/parent", { replace: true })}>
              {t("Продолжить", "Continue")}
            </Button>
          ) : hasSession ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("Новый пароль", "New password")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("Повторите пароль", "Confirm password")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("Сохраняем...", "Saving…") : t("Сохранить пароль", "Save password")}
              </Button>
            </form>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                {t("Запросите новое письмо для смены пароля на странице входа.", "Request a new password reset email on the sign-in page.")}
              </p>
              <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>
                {t("На страницу входа", "Back to sign in")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
