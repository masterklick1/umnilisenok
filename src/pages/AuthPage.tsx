import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Users, Baby } from "lucide-react";

const signUpSchema = z.object({
  email: z.string().email({ message: "Неверный формат email" }),
  password: z.string().min(6, { message: "Пароль должен быть минимум 6 символов" }),
  firstName: z.string().min(2, { message: "Имя должно быть минимум 2 символа" }),
});

const signInSchema = z.object({
  email: z.string().email({ message: "Неверный формат email" }),
  password: z.string().min(1, { message: "Введите пароль" }),
});

type UserRole = "parent" | "child";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Check user role and redirect accordingly
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.role === "parent") {
            navigate("/parent");
          } else {
            navigate("/");
          }
        });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = signUpSchema.safeParse({ email, password, firstName });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0].toString()] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, firstName);
        if (!error) {
          // Update role after signup
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser && selectedRole) {
            await supabase
              .from("profiles")
              .update({ role: selectedRole })
              .eq("id", newUser.id);
          }
          
          if (selectedRole === "parent") {
            navigate("/parent");
          } else {
            navigate("/");
          }
        }
      } else {
        const result = signInSchema.safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0].toString()] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (!error) {
          // Check role and redirect
          const { data: { user: loggedUser } } = await supabase.auth.getUser();
          if (loggedUser) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", loggedUser.id)
              .single();
            
            if (profile?.role === "parent") {
              navigate("/parent");
            } else {
              navigate("/");
            }
          }
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Role selection screen for signup
  if (isSignUp && !selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">🦊</div>
            <CardTitle className="text-3xl">Умный Лисенок</CardTitle>
            <CardDescription>Выберите тип аккаунта</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => setSelectedRole("parent")}
            >
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="font-semibold">Я родитель</p>
                <p className="text-xs text-muted-foreground">Создать аккаунты для детей и следить за прогрессом</p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col gap-2 hover:border-secondary hover:bg-secondary/5"
              onClick={() => setSelectedRole("child")}
            >
              <Baby className="w-8 h-8 text-secondary" />
              <div>
                <p className="font-semibold">Я ребёнок</p>
                <p className="text-xs text-muted-foreground">Учиться и играть в приложении</p>
              </div>
            </Button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Уже есть аккаунт? Войти
              </button>
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
          <div className="text-6xl mb-4">🦊</div>
          <CardTitle className="text-3xl">Умный Лисенок</CardTitle>
          <CardDescription>
            {isSignUp 
              ? selectedRole === "parent" 
                ? "Создайте родительский аккаунт" 
                : "Создайте аккаунт ребёнка"
              : "Войдите в аккаунт"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  {selectedRole === "parent" ? "Ваше имя" : "Имя ребёнка"}
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Введите имя"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName}</p>
                )}
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
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
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
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Загрузка..." : isSignUp ? "Зарегистрироваться" : "Войти"}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            {isSignUp && selectedRole && (
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block w-full"
              >
                ← Изменить тип аккаунта
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setSelectedRole(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp
                ? "Уже есть аккаунт? Войти"
                : "Нет аккаунта? Зарегистрироваться"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}