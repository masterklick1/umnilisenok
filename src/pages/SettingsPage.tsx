import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2, VolumeX, LogOut, LogIn, User, Lock, Trash2, Battery, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SOUND_KEY } from "@/lib/sound";
import { clearParentPin, hasParentPin, purgeLegacyPin, setParentPin } from "@/lib/parent-pin";
import { useUserRole } from "@/hooks/useUserRole";
import { ScreenTimeSettings } from "@/components/ScreenTimeSettings";
import { WatchModeSettings } from "@/components/WatchModeSettings";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { ProminentDisclosureModal } from "@/components/ProminentDisclosureModal";
import { queryBackgroundGeoPermission, requestBackgroundGeoPermission, type BackgroundGeoPermissionState } from "@/lib/geo-permission";

// @capacitor/app native plugin bridge (available only on native runtimes)
const App: any = Capacitor.isNativePlatform() ? registerPlugin<any>("App") : null;

export default function SettingsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isDemo, signOut } = useAuth();
  const { isChild } = useUserRole();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [pinSet, setPinSet] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [backgroundGeoPermission, setBackgroundGeoPermission] = useState<BackgroundGeoPermissionState>("prompt");
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [requestingBgGeo, setRequestingBgGeo] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || isDemo) return;
    if (!confirm(t("Удалить аккаунт и все данные безвозвратно?", "Permanently delete the account and all its data?"))) return;
    if (!confirm(t("Точно удалить? Это действие нельзя отменить.", "Delete your account? This action is permanent."))) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast({ title: t("Аккаунт удалён", "Account deleted"), description: t("Все данные удалены безвозвратно.", "All account data was permanently deleted.") });
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (e) {
      toast({
        title: t("Не удалось удалить аккаунт", "Couldn’t delete the account"),
        description: e instanceof Error ? e.message : t("Попробуйте позже", "Try again later"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setSoundEnabled(localStorage.getItem(SOUND_KEY) !== "false");
    if (isDemo) return;
    purgeLegacyPin();
    hasParentPin().then(setPinSet);
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
      queryBackgroundGeoPermission()
        .then(setBackgroundGeoPermission)
        .catch(() => setBackgroundGeoPermission("prompt"));
    }
  }, [user, isDemo]);

  const toggleSound = (v: boolean) => {
    setSoundEnabled(v);
    localStorage.setItem(SOUND_KEY, String(v));
    if (!v && "speechSynthesis" in window) window.speechSynthesis.cancel();
    toast({ title: v ? t("Звук включён 🔊", "Sound on 🔊") : t("Звук выключен 🔇", "Sound off 🔇") });
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
      title: error ? t("Ошибка", "Error") : t("Имя сохранено", "Name saved"),
      description: error?.message,
      variant: error ? "destructive" : "default",
    });
  };

  const savePin = async () => {
    if (!user) return;
    if (!/^\d{4}$/.test(newPin)) {
      toast({ title: t("PIN должен быть 4 цифры", "The PIN must be 4 digits"), variant: "destructive" });
      return;
    }
    const ok = await setParentPin(user.id, newPin);
    if (!ok) {
      toast({ title: t("Не удалось сохранить PIN", "Couldn’t save the PIN"), variant: "destructive" });
      return;
    }
    setPinSet(true);
    setNewPin("");
    toast({ title: t("Родительский PIN сохранён 🔒", "Parent PIN saved 🔒") });
  };

  const clearPin = async () => {
    const ok = await clearParentPin();
    if (!ok) {
      toast({ title: t("Не удалось удалить PIN", "Couldn’t remove the PIN"), variant: "destructive" });
      return;
    }
    setPinSet(false);
    toast({ title: t("PIN удалён", "PIN removed") });
  };

  const openDemoAuth = async (mode: "login" | "register") => {
    await signOut();
    navigate(`/auth?mode=${mode}`, { replace: true });
  };

  const handleSignOut = async () => {
    if (!confirm(t("Выйти из аккаунта?", "Sign out?"))) return;
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
          title: t("✅ Фоновый трекинг включен", "✅ Background tracking enabled"),
          description: t("Приложение будет отслеживать геопозицию в фоне", "The app will track location in the background"),
        });
      } else if (result === "denied") {
        toast({
          title: t("❌ Доступ запрещен", "❌ Permission denied"),
          description: t("Пожалуйста, измените разрешение в настройках", "Change the location permission in Settings"),
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: t("Ошибка", "Error"),
        description: t("Не удалось запросить разрешение", "Couldn’t request permission"),
        variant: "destructive",
      });
    } finally {
      setRequestingBgGeo(false);
    }
  };

  const openBatteryOptimizationSettings = async () => {
    if (!App) {
      toast({
        title: t("Откройте вручную", "Open the settings manually"),
        description: t("Настройки → Батарея → Оптимизация батареи → Приложение → Не оптимизировать", "Settings → Battery → Battery optimization → Select the app → Don’t optimize"),
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
        title: t("Откройте вручную", "Open the settings manually"),
        description: t("Настройки → Батарея → Оптимизация батареи → Приложение → Не оптимизировать", "Settings → Battery → Battery optimization → Select the app → Don’t optimize"),
        variant: "default",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("Назад", "Back")}
        </Button>

        <h1 className="text-3xl font-bold mb-6">{t("⚙️ Настройки", "⚙️ Settings")}</h1>

        <Card className="p-5 mb-4">
          <h2 className="mb-3 font-semibold">{t("Язык приложения", "App language")}</h2>
          <LanguageSwitcher />
        </Card>

        {/* Профиль */}
        {!isDemo && <Card className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-3 font-semibold">
            <User className="w-5 h-5 text-primary" /> {t("Профиль", "Profile")}
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Email</Label>
              <div className="text-sm text-muted-foreground mt-1">{user?.email}</div>
            </div>
            <div>
              <Label htmlFor="name" className="text-sm">{t("Имя", "Name")}</Label>
              <div className="flex gap-2 mt-1">
                <Input id="name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Button onClick={saveName} disabled={savingName}>{t("Сохранить", "Save")}</Button>
              </div>
            </div>
          </div>
        </Card>}

        {/* Звук */}
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
              {t("Звуки и озвучка", "Sounds and voice")}
            </div>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {t("Голосовые подсказки и весёлые звуки за правильные ответы", "Spoken hints and fun sounds for correct answers")}
          </p>
        </Card>

        {!isDemo && (
          <>
            <ScreenTimeSettings />
            <WatchModeSettings />
          </>
        )}

        {/* Родительский PIN — только для родителей на своём телефоне */}
        {!isDemo && !isChild && (
          <Card className="p-5 mb-4">
            <div className="flex items-center gap-2 mb-3 font-semibold">
              <Lock className="w-5 h-5 text-primary" /> {t("Родительский PIN", "Parent PIN")}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {t("4 цифры — чтобы открыть родительский раздел", "Use a 4-digit PIN to open the parent dashboard")}
            </p>
            {pinSet ? (
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("PIN установлен:", "PIN set:")} <span className="font-mono">••••</span></span>
                <Button variant="outline" size="sm" onClick={clearPin}>
                  <Trash2 className="w-4 h-4 mr-1" /> {t("Удалить", "Remove")}
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
                <Button onClick={savePin}>{t("Установить", "Set PIN")}</Button>
              </div>
            )}
          </Card>
        )}

        {!isDemo && user && isChild && (
          <Card className="p-5 mb-4 border-primary/20 bg-primary/5">
            <p className="text-sm text-muted-foreground">
              {t("📱 Это аккаунт ребёнка. Родители управляют и следят со своего телефона в родительском кабинете.", "📱 This is a child account. Parents can manage it and view activity from the parent dashboard on their phones.")}
            </p>
          </Card>
        )}

        {/* Фоновая геолокация — native Android (уведомление FGS на устройстве ребёнка) */}
        {!isDemo && Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android" && (
          <>
            <Card className="p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold">
                  <MapPin className="w-5 h-5 text-primary" /> {t("Фоновое отслеживание", "Background tracking")}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t("Отслеживать местоположение ребёнка даже когда приложение закрыто. В шторке Android появится постоянное уведомление «Геолокация активна».", "Track your child’s location when the app is closed. Android will display a persistent location notification.")}
                {backgroundGeoPermission === "always" && (
                  <span className="block mt-2 text-green-600 dark:text-green-400">{t("✅ Фоновый трекинг активен", "✅ Background tracking is active")}</span>
                )}
              </p>
              {backgroundGeoPermission !== "always" && (
                <Button onClick={requestBackgroundGeolocation} disabled={requestingBgGeo} className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  {requestingBgGeo ? t("Загрузка...", "Loading…") : t("Включить фоновый трекинг", "Enable background tracking")}
                </Button>
              )}
            </Card>

            {/* Оптимизация батареи */}
            <Card className="p-5 mb-4">
              <div className="flex items-center gap-2 mb-3 font-semibold">
                <Battery className="w-5 h-5 text-primary" /> {t("Оптимизация батареи", "Battery optimization")}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t("Отключите оптимизацию батареи для приложения, чтобы фоновый трекинг работал надежно.", "Turn off battery optimization for this app to keep background tracking working reliably.")}
              </p>
              <Button variant="outline" onClick={openBatteryOptimizationSettings} className="w-full">
                <Battery className="w-4 h-4 mr-2" />
                {t("Отключить оптимизацию", "Turn off optimization")}
              </Button>
            </Card>
          </>
        )}

        {/* О приложении */}
        <Card className="p-5 mb-4">
          <div className="font-semibold mb-2">{t("О приложении", "About")}</div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>{t("🦊 Умный Лисёнок", "🦊 Clever Little Fox")}</div>
            <div>{t("Версия 1.0", "Version 1.0")}</div>
          </div>
        </Card>

        {isDemo ? (
          <Card className="space-y-3 p-5">
            <h2 className="font-semibold">{t("Демо-режим", "Demo mode")}</h2>
            <p className="text-sm text-muted-foreground">{t("Вы можете заниматься без регистрации. Для родительского кабинета нужен аккаунт.", "Try the lessons without signing up. The parent dashboard requires an account.")}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void openDemoAuth("login")}>{t("Войти", "Sign in")}</Button>
              <Button onClick={() => void openDemoAuth("register")}>{t("Зарегистрироваться", "Sign up")}</Button>
            </div>
          </Card>
        ) : !user ? (
          <Button className="w-full" onClick={() => navigate("/auth")}>
            <LogIn className="w-4 h-4 mr-2" /> {t("Войти в аккаунт", "Sign in")}
          </Button>
        ) : (
          <>
            {/* Выход */}
            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" /> {t("Выйти из аккаунта", "Sign out")}
            </Button>

            {/* Удаление аккаунта */}
            <Card className="p-5 mt-4 border-destructive/40">
              <div className="font-semibold mb-1">{t("Удаление аккаунта", "Account deletion")}</div>
              <p className="text-sm text-muted-foreground mb-3">
                {t("Аккаунт и все связанные данные (прогресс, геолокация, фото, привязки) будут удалены безвозвратно.", "Your account and all associated data, including progress, location, photos and account links, will be permanently deleted.")}
              </p>
              <Button
                variant="destructive"
                className="w-full"
                disabled={deleting}
                onClick={handleDeleteAccount}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? t("Удаляем...", "Deleting…") : t("Удалить аккаунт", "Delete account")}
              </Button>
            </Card>
          </>
        )}



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
