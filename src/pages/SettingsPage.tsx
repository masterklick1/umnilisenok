import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2, VolumeX, LogOut, User, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SOUND_KEY = "settings.soundEnabled";
const PIN_KEY = "settings.parentPin";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setSoundEnabled(localStorage.getItem(SOUND_KEY) !== "false");
    setPin(localStorage.getItem(PIN_KEY) || "");
    if (user) {
      supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setFirstName(data?.first_name || ""));
    }
  }, [user]);

  const toggleSound = (v: boolean) => {
    setSoundEnabled(v);
    localStorage.setItem(SOUND_KEY, String(v));
    if (!v && "speechSynthesis" in window) window.speechSynthesis.cancel();
    toast({ title: v ? "Звук включён 🔊" : "Звук выключен 🔇" });
  };

  const saveName = async () => {
    if (!user || !firstName.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName.trim() })
      .eq("id", user.id);
    setSavingName(false);
    toast({
      title: error ? "Ошибка" : "Имя сохранено",
      description: error?.message,
      variant: error ? "destructive" : "default",
    });
  };

  const savePin = () => {
    if (!/^\d{4}$/.test(newPin)) {
      toast({ title: "PIN должен быть 4 цифры", variant: "destructive" });
      return;
    }
    localStorage.setItem(PIN_KEY, newPin);
    setPin(newPin);
    setNewPin("");
    toast({ title: "Родительский PIN сохранён 🔒" });
  };

  const clearPin = () => {
    localStorage.removeItem(PIN_KEY);
    setPin("");
    toast({ title: "PIN удалён" });
  };

  const handleSignOut = async () => {
    if (!confirm("Выйти из аккаунта?")) return;
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <h1 className="text-3xl font-bold mb-6">⚙️ Настройки</h1>

        {/* Профиль */}
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-3 font-semibold">
            <User className="w-5 h-5 text-primary" /> Профиль
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Email</Label>
              <div className="text-sm text-muted-foreground mt-1">{user?.email}</div>
            </div>
            <div>
              <Label htmlFor="name" className="text-sm">Имя</Label>
              <div className="flex gap-2 mt-1">
                <Input id="name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Button onClick={saveName} disabled={savingName}>Сохранить</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Звук */}
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
              Звуки и озвучка
            </div>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Голосовые подсказки и весёлые звуки за правильные ответы
          </p>
        </Card>

        {/* Родительский PIN */}
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-3 font-semibold">
            <Lock className="w-5 h-5 text-primary" /> Родительский PIN
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            4 цифры — чтобы открыть родительский раздел
          </p>
          {pin ? (
            <div className="flex items-center justify-between">
              <span className="text-sm">PIN установлен: <span className="font-mono">••••</span></span>
              <Button variant="outline" size="sm" onClick={clearPin}>
                <Trash2 className="w-4 h-4 mr-1" /> Удалить
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              />
              <Button onClick={savePin}>Установить</Button>
            </div>
          )}
        </Card>

        {/* О приложении */}
        <Card className="p-5 mb-4">
          <div className="font-semibold mb-2">О приложении</div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>🦊 Умный Лисёнок</div>
            <div>Версия 1.0</div>
          </div>
        </Card>

        {/* Выход */}
        <Button variant="destructive" className="w-full" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" /> Выйти из аккаунта
        </Button>
      </div>
    </div>
  );
}
