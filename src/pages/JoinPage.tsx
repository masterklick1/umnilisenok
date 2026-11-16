import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, Hash, ArrowLeft } from "lucide-react";
import { QrScanner } from "@/components/child/QrScanner";
import { connectChildWithInviteCode, parseInviteCode } from "@/lib/child-connect";

type Mode = "choose" | "scan" | "code";

export default function JoinPage() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("choose");
  const [code, setCode] = useState("");
  const [connecting, setConnecting] = useState(false);

  const finishConnect = useCallback(
    async (raw: string) => {
      if (connecting) return;
      setConnecting(true);

      const result = await connectChildWithInviteCode(raw);
      setConnecting(false);

      if (result.ok === false) {
        toast({ title: t("Не получилось", "Something went wrong"), description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: t(`Привет, ${result.childName}! 🦊`, `Hi, ${result.childName}! 🦊`), description: t("Заходим в твоё приложение…", "Opening your account…") });
      navigate("/", { replace: true });
    },
    [connecting, navigate, toast],
  );

  // Direct link /join?code=ABC123 — сразу привязка
  useEffect(() => {
    const urlCode = params.get("code");
    if (urlCode) {
      finishConnect(urlCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (params.get("code") || connecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-6xl animate-bounce">🦊</div>
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-lg font-medium">{t("Подключаем твоё место…", "Connecting your account…")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-100 via-background to-yellow-50">
      <Card className="w-full max-w-md border-2 border-orange-200">
        <CardHeader className="text-center pb-2">
          <div className="text-7xl mb-2">🦊</div>
          <CardTitle className="text-2xl">{t("Я ребёнок", "I’m a child")}</CardTitle>
          <CardDescription>
            {mode === "choose" && t("Выбери, как подключиться к родителю", "Choose how to connect with your parent")}
            {mode === "scan" && t("Сканируй QR-код от мамы или папы", "Scan the QR code from your parent")}
            {mode === "code" && t("Введи 6-значный код от родителя", "Enter your parent’s 6-digit code")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "choose" && (
            <>
              <Button
                size="lg"
                className="w-full h-16 text-lg gap-3"
                onClick={() => setMode("scan")}
              >
                <QrCode className="w-7 h-7" />
                {t("Сканировать QR-код", "Scan QR code")}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="w-full h-16 text-lg gap-3"
                onClick={() => setMode("code")}
              >
                <Hash className="w-7 h-7" />
                {t("Ввести код", "Enter a code")}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate("/auth")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("Назад", "Back")}
              </Button>
            </>
          )}

          {mode === "scan" && (
            <>
              <QrScanner
                onScan={(text) => {
                  const parsed = parseInviteCode(text);
                  if (!parsed) {
                    toast({
                      title: t("Не QR от родителя", "This isn’t a parent’s QR code"),
                      description: t("Попробуй другой код или введи цифры вручную", "Try another QR code or enter the digits yourself"),
                      variant: "destructive",
                    });
                    return;
                  }
                  finishConnect(parsed);
                }}
                onError={(msg) =>
                  toast({
                    title: t("Камера недоступна", "Camera unavailable"),
                    description: msg + t(". Используй ввод кода.", ". Enter the code instead."),
                    variant: "destructive",
                  })
                }
              />
              <Button variant="outline" className="w-full" onClick={() => setMode("choose")}>
                {t("Назад", "Back")}
              </Button>
            </>
          )}

          {mode === "code" && (
            <>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6))}
                placeholder="ABC123"
                maxLength={6}
                className="text-center text-3xl font-mono tracking-[0.3em] h-16"
                inputMode="text"
                autoComplete="off"
              />
              <Button
                size="lg"
                className="w-full h-14 text-lg"
                disabled={code.length !== 6 || connecting}
                onClick={() => finishConnect(code)}
              >
                {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("Подключиться", "Connect")}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setMode("choose")}>
                {t("Назад", "Back")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
