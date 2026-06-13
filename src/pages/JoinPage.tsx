import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Step = "code" | "register" | "done";

export default function JoinPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState((params.get("code") || "").toUpperCase());
  const [checking, setChecking] = useState(false);
  const [childName, setChildName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const verifyCode = async (c: string) => {
    setChecking(true);
    const { data, error } = await supabase.rpc("get_invite_by_code", { p_code: c.trim().toUpperCase() });
    setChecking(false);
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      toast({ title: "Код не найден", description: "Проверь правильность кода или попроси новый.", variant: "destructive" });
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setChildName(row.child_first_name);
    setParentId(row.parent_id);
    setStep("register");
  };

  // auto-verify if code came from URL
  useEffect(() => {
    if (params.get("code") && step === "code") {
      verifyCode(params.get("code")!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 6) {
      toast({ title: "Заполни email и пароль (от 6 символов)", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    // Sign up child
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { first_name: childName },
      },
    });

    if (signupError || !signupData.user) {
      setSubmitting(false);
      toast({ title: "Ошибка регистрации", description: signupError?.message, variant: "destructive" });
      return;
    }

    const newChildId = signupData.user.id;

    // Redeem invite (SECURITY DEFINER — works regardless of session state)
    const { error: redeemError } = await supabase.rpc("redeem_child_invite", {
      p_code: code.trim().toUpperCase(),
      p_child_id: newChildId,
    });

    setSubmitting(false);

    if (redeemError) {
      toast({ title: "Не удалось привязать", description: redeemError.message, variant: "destructive" });
      return;
    }

    toast({ title: `Готово! 🎉`, description: `Аккаунт ${childName} привязан к родителю.` });
    setStep("done");

    sessionStorage.setItem("activeChildId", newChildId);
    sessionStorage.setItem("activeChildName", childName);

    // If session exists — go to main app
    if (signupData.session) {
      setTimeout(() => navigate("/"), 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-6xl mb-2">🦊</div>
          <CardTitle className="text-2xl">Привязка устройства</CardTitle>
          <CardDescription>
            {step === "code" && "Введи код приглашения от родителя"}
            {step === "register" && `Создай аккаунт для ${childName}`}
            {step === "done" && "Всё готово!"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "code" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Код</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="text-2xl font-mono tracking-widest text-center"
                />
              </div>
              <Button className="w-full" onClick={() => verifyCode(code)} disabled={checking || code.length < 6}>
                {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Продолжить"}
              </Button>
              <button
                onClick={() => navigate("/auth")}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Я родитель — войти в аккаунт
              </button>
            </div>
          )}

          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="bg-primary/10 rounded-lg p-3 text-sm">
                Создаём аккаунт ребёнка <b>{childName}</b>. После регистрации этот телефон будет привязан к родителю.
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email ребёнка</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="child@example.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Можно использовать второй email родителя, например <code>parent+masha@gmail.com</code>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Создать и привязать"}
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="text-center space-y-4 py-4">
              <div className="text-6xl">✅</div>
              <p>Аккаунт <b>{childName}</b> привязан.</p>
              <p className="text-sm text-muted-foreground">
                Если потребуется подтвердить email — проверь почту. После входа откроется детский режим.
              </p>
              <Button onClick={() => navigate("/auth")} variant="outline" className="w-full">
                Войти
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
