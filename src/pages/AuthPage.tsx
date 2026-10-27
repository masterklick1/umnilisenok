import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Users, Baby, Sparkles } from "lucide-react";
import { getRussianAuthError } from "@/lib/auth-errors";
import AnimatedFox from "@/components/AnimatedFox";

const signUpSchema = z.object({
  email: z.string().email({ message: "Неверный формат email" }),
  password: z.string().min(6, { message: "Пароль должен быть минимум 6 символов" }),
  firstName: z.string().min(2, { message: "Имя должно быть минимум 2 символа" }),
});

const signInSchema = z.object({
  email: z.string().email({ message: "Неверный формат email" }),
  password: z.string().min(1, { message: "Введите пароль" }),
});

type Screen = "choose" | "parent" | "reset";

export default function AuthPage() {
  const [screen, setScreen] = useState<Screen>("choose");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signUp, signIn, startDemo, isDemo, user } = useAuth();
  const navigate = useNavigate();

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
          navigate("/parent", { replace: true });
        }
      });
  }, [user, isDemo, navigate]);

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
          setErrors({ policy: "Необходимо принять политику конфиденциальности" });
          setIsLoading(false);
          return;
        }

        const result = signUpSchema.safeParse({ email, password, firstName });
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
          navigate("/parent");
        } else {
          setErrors({ form: getRussianAuthError(error, "sign-up") });
        }
      } else {
        const result = signInSchema.safeParse({ email, password });
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
          navigate("/parent");
        } else {
          setErrors({ form: getRussianAuthError(error, "sign-in") });
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
      setErrors({ email: "Неверный формат email" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://umnilisenok.lovable.app/reset-password",
    });
    setIsLoading(false);

    if (error) {
      setErrors({ email: "Не удалось отправить письмо. Попробуйте позже." });
      return;
    }
    setResetSent(true);
  };

  if (screen === "reset") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">🔑</div>
            <CardTitle className="text-2xl">Забыли пароль?</CardTitle>
            <CardDescription>
              {resetSent
                ? "Мы отправили письмо со ссылкой для смены пароля"
                : "Введите почту, на которую зарегистрирован аккаунт"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetSent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Письмо отправлено на <span className="font-medium text-foreground">{email}</span>.
                  Откройте его и перейдите по ссылке, чтобы задать новый пароль.
                  Если письма нет — проверьте папку «Спам».
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    setResetSent(false);
                    setScreen("parent");
                  }}
                >
                  Вернуться ко входу
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
                  {isLoading ? "Отправляем..." : "Отправить ссылку"}
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
              ← Назад
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
            <AnimatedFox size={160} />
            <CardTitle className="text-3xl font-extrabold">Умный Лисёнок</CardTitle>
            <CardDescription className="text-base">Привет! Кто заходит в приложение?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-20 text-lg flex-col gap-1 border-2"
              onClick={() => setScreen("parent")}
            >
              <Users className="w-8 h-8" />
              Я родитель
            </Button>
            <Button
              size="lg"
              className="w-full h-20 text-lg flex-col gap-1"
              onClick={() => navigate("/join")}
            >
              <Baby className="w-8 h-8" />
              Я ребёнок
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full h-20 text-lg flex-col gap-1 border-2 border-primary/20"
              onClick={handleDemo}
            >
              <Sparkles className="w-8 h-8" />
              Попробовать бесплатно
              <span className="text-xs font-normal text-muted-foreground">
                Уроки без регистрации, родительский контроль после аккаунта
              </span>
            </Button>

            <div className="pt-2 text-center">
              <a
                href="https://umnilisenok.lovable.app/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              >
                Политика конфиденциальности
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">👨‍👩‍👧</div>
          <CardTitle className="text-2xl">Родитель</CardTitle>
          <CardDescription>
            {isSignUp ? "Создайте аккаунт" : "Войдите в аккаунт"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="firstName">Ваше имя</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Введите имя"
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
              <Label htmlFor="password">Пароль</Label>
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
                    Я принимаю{" "}
                    <a
                      href="https://umnilisenok.lovable.app/privacy.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline font-medium hover:opacity-80"
                    >
                      Политику конфиденциальности
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
              {isLoading ? "Загрузка..." : isSignUp ? "Зарегистрироваться" : "Войти"}
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
                Забыли пароль?
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {isSignUp ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
            </button>
            <button
              type="button"
              onClick={() => setScreen("choose")}
              className="block w-full text-sm text-muted-foreground hover:text-foreground"
            >
              ← Назад
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
