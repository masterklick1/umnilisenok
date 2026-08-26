import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2, VolumeX, LogOut, User, Lock, Trash2, Battery, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SOUND_KEY } from "@/lib/sound";
import { PIN_KEY } from "@/lib/parent-pin";
import { useUserRole } from "@/hooks/useUserRole";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { ProminentDisclosureModal } from "@/components/ProminentDisclosureModal";
import { queryBackgroundGeoPermission, requestBackgroundGeoPermission, type BackgroundGeoPermissionState } from "@/lib/geo-permission";

// @capacitor/app native plugin bridge (available only on native runtimes)
const App: any = Capacitor.isNativePlatform() ? registerPlugin<any>("App") : null;

export default function SettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { isChild } = useUserRole();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [backgroundGeoPermission, setBackgroundGeoPermission] = useState<BackgroundGeoPermissionState>("prompt");
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [requestingBgGeo, setRequestingBgGeo] = useState(false);

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

    // Проверить статус фоновой геолокации
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      queryBackgroundGeoPermission().then(setBackgroundGeoPermission);
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

  const requestBackgroundGeolocation = async () => {
    setShowDisclosure(true);
  };

  const handleBackgroundGeoConfirm = async () => {
    setShowDisclosure(false);
    setRequestingBgGeo(true);
    try {
      const result = await requestBackgroundGeoPermission();
      setBackgroundGeoPermission(result);
      if (result === "always") {
        toast({
          title: "✅ Фоновый трекинг включен",
          description: "Приложение будет отслеживать геопозицию в фоне",
        });
      } else if (result === "denied") {
        toast({
          title: "❌ Доступ запрещен",
          description: "Пожалуйста, измените разрешение в настройках",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Ошибка",
        description: "Не удалось запросить разрешение",
        variant: "destructive",
      });
    } finally {
      setRequestingBgGeo(false);
    }
  };

  const openBatteryOptimizationSettings = async () => {
    if (!App) {
      toast({
        title: "Откройте вручную",
        description: "Настройки → Батарея → Оптимизация батареи → Приложение → Не оптимизировать",
        variant: "default",
      });
      return;
    }

    try {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
        const appId = "app.lovable.umnilisenok";
        try {
          // Попытка 1: Прямой intent для отключения оптимизации батареи
          await App.openUrl({
            url: `intent://settings/request_ignore_battery_optimizations?package=${appId}`,
          });
        } catch {
          // Попытка 2: Открыть страницу приложения в настройках батареи
          try {
            await App.openUrl({
              url: "intent://settings/battery/app_battery_usage",
            });
          } catch {
            // Попытка 3: Открыть общие настройки приложения
            await App.openUrl({
              url: `intent://settings/apps/${appId}`,
            });
          }
        }
      }
    } catch (e) {
      toast({
        title: "Откройте вручную",
        description: "Настройки → Батарея → Оптимизация батареи → Приложение → Не оптимизировать",
        variant: "default",
      });
    }
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

        {/* Родительский PIN — только для родителей на своём телефоне */}
        {!isChild && (
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
        )}

        {isChild && (
          <Card className="p-5 mb-4 border-primary/20 bg-primary/5">
            <p className="text-sm text-muted-foreground">
              📱 Это аккаунт ребёнка. Родители управляют и следят со своего телефона в родительском
              кабинете.
            </p>
          </Card>
        )}

        {/* Фоновая геолокация — для родителей */}
        {!isChild && Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android" && (
          <>
            <Card className="p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold">
                  <MapPin className="w-5 h-5 text-primary" /> Фоновое отслеживание
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Отслеживать местоположение ребёнка даже когда приложение закрыто.
                {backgroundGeoPermission === "always" && (
                  <span className="block mt-2 text-green-600 dark:text-green-400">✅ Фоновый трекинг активен</span>
                )}
              </p>
              {backgroundGeoPermission !== "always" && (
                <Button onClick={requestBackgroundGeolocation} disabled={requestingBgGeo} className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  {requestingBgGeo ? "Загрузка..." : "Включить фоновый трекинг"}
                </Button>
              )}
            </Card>

            {/* Оптимизация батареи */}
            <Card className="p-5 mb-4">
              <div className="flex items-center gap-2 mb-3 font-semibold">
                <Battery className="w-5 h-5 text-primary" /> Оптимизация батареи
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Отключите оптимизацию батареи для приложения, чтобы фоновый трекинг работал надежно.
              </p>
              <Button variant="outline" onClick={openBatteryOptimizationSettings} className="w-full">
                <Battery className="w-4 h-4 mr-2" />
                Отключить оптимизацию
              </Button>
            </Card>
          </>
        )}

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

        {/* Удаление аккаунта */}
        <Card className="p-5 mt-4 border-destructive/40">
          <div className="font-semibold mb-1">Удаление аккаунта</div>
          <p className="text-sm text-muted-foreground mb-3">
            Аккаунт и все связанные данные (прогресс, геолокация, фото, привязки) будут удалены
            безвозвратно.
          </p>
          <Button
            variant="destructive"
            className="w-full"
            disabled={deleting}
            onClick={handleDeleteAccount}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? "Удаляем..." : "Удалить аккаунт"}
          </Button>
        </Card>


        {/* Prominent Disclosure Modal */}
        <ProminentDisclosureModal
          open={showDisclosure}
          onConfirm={handleBackgroundGeoConfirm}
          onCancel={() => setShowDisclosure(false)}
        />
      </div>
    </div>
  );
}
