import { Capacitor } from "@capacitor/core";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Users, Baby, Sparkles } from "lucide-react";
import { getAuthError } from "@/lib/auth-errors";
import AnimatedFox from "@/components/AnimatedFox";
import { TOYS_LESSON_PATH } from "@/lib/toys-lesson";

type Screen = "choose" | "parent" | "reset";

export default function AuthPage() {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const parentDestination = searchParams.get("next") === "checkout" ? "/checkout" : "/parent";
  const [screen, setScreen] = useState<Screen>(mode === "login" || mode === "register" ? "parent" : "choose");
  const [isSignUp, setIsSignUp] = useState(mode === "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signUp, signIn, startDemo, isDemo, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => setErrors({}), [language]);

  useEffect(() => {
    if (!user) return;
    if (isDemo) {
      navigate("/", { replace: true });
      return;
    }

    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role === "child") {
          sessionStorage.setItem("activeChildId", user.id);
          navigate("/", { replace: true });
        } else {
          navigate(parentDestination, { replace: true });
        }
      });
  }, [user, isDemo, navigate, parentDestination]);

  const handleDemo = () => {
    startDemo();
    navigate("/", { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!acceptedPolicy) {
          setErrors({ policy: t("Необходимо принять политику конфиденциальности", "Accept the Privacy Policy to create an account") });
          setIsLoading(false);
          return;
        }

        const result = z.object({
          email: z.string().email({ message: t("Неверный формат email", "Enter a valid email address") }),
          password: z.string().min(6, { message: t("Пароль должен быть минимум 6 символов", "Use at least 6 characters for your password") }),
          firstName: z.string().min(2, { message: t("Имя должно быть минимум 2 символа", "Enter at least 2 characters for your name") }),
        }).safeParse({ email, password, firstName });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, firstName);
        if (!error) {
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from("profiles").update({ role: "parent" }).eq("id", newUser.id);
          }
          navigate(parentDestination);
        } else {
          setErrors({ form: getAuthError(error, "sign-up", t) });
        }
      } else {
        const result = z.object({
          email: z.string().email({ message: t("Неверный формат email", "Enter a valid email address") }),
          password: z.string().min(1, { message: t("Введите пароль", "Enter your password") }),
        }).safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (!error) {
          navigate(parentDestination);
        } else {
          setErrors({ form: getAuthError(error, "sign-in", t) });
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const emailCheck = z.string().email().safeParse(email);
    if (!emailCheck.success) {
      setErrors({ email: t("Неверный формат email", "Enter a valid email address") });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://umnilisenok.lovable.app/reset-password",
    });
    setIsLoading(false);

    if (error) {
      setErrors({ email: t("Не удалось отправить письмо. Попробуйте позже.", "We couldn't send the email. Try again later.") });
      return;
    }
    setResetSent(true);
  };

  if (screen === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <LanguageSwitcher />
            <div className="text-6xl mb-4">🔑</div>
            <CardTitle className="text-2xl">{t("Забыли пароль?", "Forgot your password?")}</CardTitle>
            <CardDescription>
              {resetSent
                ? t("Мы отправили письмо со ссылкой для смены пароля", "We sent you a password reset link")
                : t("Введите почту, на которую зарегистрирован аккаунт", "Enter the email address you used to sign up")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetSent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("Письмо отправлено на", "We sent an email to")} <span className="font-medium text-foreground">{email}</span>{t(". Откройте его и перейдите по ссылке, чтобы задать новый пароль. Если письма нет — проверьте папку «Спам».", ". Follow the link to set a new password. If you can’t find the email, check your spam folder.")}
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    setResetSent(false);
                    setScreen("parent");
                  }}
                >
                  {t("Вернуться ко входу", "Back to sign in")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("Отправляем...", "Sending…") : t("Отправить ссылку", "Send reset link")}
                </Button>
              </form>
            )}
            <button
              type="button"
              onClick={() => {
                setResetSent(false);
                setScreen("parent");
              }}
              className="mt-4 block w-full text-sm text-muted-foreground hover:text-foreground"
            >
              {t("← Назад", "← Back")}
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }



  if (screen === "choose") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-background to-secondary/20">
        <Card className="w-full max-w-md rounded-3xl shadow-xl border-2 animate-fade-in">
          <CardHeader className="text-center pb-4">
            <LanguageSwitcher />
            <AnimatedFox size={160} />
            <CardTitle className="text-3xl font-extrabold">{t("Умный Лисёнок", "Clever Little Fox")}</CardTitle>
            <CardDescription className="text-base">{t("Привет! Кто заходит в приложение?", "Hi! Who’s using the app?")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-20 text-lg flex-col gap-1 border-2"
              onClick={() => setScreen("parent")}
            >
              <Users className="w-8 h-8" />
              {t("Я родитель", "I’m a parent")}
            </Button>
            <Button
              size="lg"
              className="w-full h-20 text-lg flex-col gap-1"
              onClick={() => navigate("/join")}
            >
              <Baby className="w-8 h-8" />
              {t("Я ребёнок", "I’m a child")}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full h-20 text-lg flex-col gap-1 border-2 border-primary/20"
              onClick={handleDemo}
            >
              <Sparkles className="w-8 h-8" />
              {t("Попробовать бесплатно", "Try for free")}
              <span className="text-xs font-normal text-muted-foreground">
                {t("Уроки без регистрации, родительский контроль после аккаунта", "Play lessons without an account. Sign up for parental controls.")}
              </span>
            </Button>

            <div className="rounded-2xl bg-teal-50 p-4 text-center text-teal-950">
              <p className="font-semibold">{t("Русский через игру · Мои игрушки", "Russian through play · My toys")}</p>
              <p lang={language === "ru" ? "tg" : "en"} className="mt-1 text-sm">
                {t("Барои кӯдаконе, ки нав ба омӯзиши забони русӣ шурӯъ мекунанд.", "For children who are just starting to learn Russian.")}
              </p>
              <Button asChild variant="link" className="mt-1 text-teal-800">
                <Link to={TOYS_LESSON_PATH}>{t("Попробовать урок", "Try the lesson")}</Link>
              </Button>
            </div>

            <div className="pt-2 text-center">
              <a
                href="https://umnilisenok.lovable.app/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              >
                {t("Политика конфиденциальности", "Privacy Policy")}
              </a>
            </div>
            {!Capacitor.isNativePlatform() && (
              <nav aria-label={t("Информация для родителей", "Parent information")} className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                <a href="/pricing.html" className="underline">{t("Цена и полный доступ", "Pricing and full access")}</a>
                <a href="/terms.html" className="underline">{t("Условия использования", "Terms of use")}</a>
                <a href="/refunds.html" className="underline">{t("Возврат средств", "Refund policy")}</a>
                <a href="mailto:masterklick1@gmail.com" className="underline">{t("Поддержка", "Support")}</a>
              </nav>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <LanguageSwitcher />
          <div className="text-6xl mb-4">👨‍👩‍👧</div>
          <CardTitle className="text-2xl">{t("Родитель", "Parent")}</CardTitle>
          <CardDescription>
            {isSignUp ? t("Создайте аккаунт", "Create an account") : t("Войдите в аккаунт", "Sign in to your account")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("Ваше имя", "Your name")}</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder={t("Введите имя", "Enter your name")}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("Пароль", "Password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            {isSignUp && (
              <div className="space-y-1">
                <div className="flex items-start space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="policy"
                    checked={acceptedPolicy}
                    onChange={(e) => setAcceptedPolicy(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <Label htmlFor="policy" className="text-xs leading-normal cursor-pointer text-muted-foreground">
                    {t("Я принимаю", "I accept the")}{" "}
                    <a
                      href="https://umnilisenok.lovable.app/privacy.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline font-medium hover:opacity-80"
                    >
                      {t("Политику конфиденциальности", "Privacy Policy")}
                    </a>
                  </Label>
                </div>
                {errors.policy && <p className="text-sm text-destructive">{errors.policy}</p>}
              </div>
            )}

            {errors.form && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {errors.form}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || (isSignUp && !acceptedPolicy)}
            >
              {isLoading ? t("Загрузка...", "Loading…") : isSignUp ? t("Зарегистрироваться", "Sign up") : t("Войти", "Sign in")}
            </Button>
          </form>
          <div className="mt-4 space-y-2 text-center">
            {!isSignUp && (
              <button
                type="button"
                onClick={() => {
                  setErrors({});
                  setResetSent(false);
                  setScreen("reset");
                }}
                className="block w-full text-sm text-primary underline hover:opacity-80"
              >
                {t("Забыли пароль?", "Forgot your password?")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {isSignUp ? t("Уже есть аккаунт? Войти", "Already have an account? Sign in") : t("Нет аккаунта? Зарегистрироваться", "New here? Sign up")}
            </button>
            <button
              type="button"
              onClick={() => setScreen("choose")}
              className="block w-full text-sm text-muted-foreground hover:text-foreground"
            >
              {t("← Назад", "← Back")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
