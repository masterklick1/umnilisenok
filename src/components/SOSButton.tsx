import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertOctagon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export const SOSButton = ({ big = false }: { big?: boolean }) => {
  const { t } = useLanguage();
  const { user, isDemo } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const sendSOS = async () => {
    if (!user?.id) return;
    if (isDemo) {
      toast({
        title: t("SOS доступен после подключения", "Link an account to use SOS"),
        description: t("В демо можно смотреть уроки, а безопасность и уведомления включаются в аккаунте ребёнка.", "Demo mode includes lessons. Link a child account to use safety features and notifications."),
      });
      return;
    }

    setSending(true);

    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => null);
      }

      let lat: number | null = null;
      let lng: number | null = null;
      let acc: number | null = null;

      try {
        if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Geolocation")) {
          try {
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
            acc = pos.coords.accuracy;
          } catch (e) {
            console.error(e);
          }
        } else {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, {
              enableHighAccuracy: true,
              timeout: 10000,
            }),
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          acc = pos.coords.accuracy;
        }
      } catch (e) {
        console.error(e);
      }

      const { error } = await supabase.from("sos_alerts").insert([
        {
          child_id: user.id,
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          message: "Ребёнок нажал SOS",
        },
      ]);
      if (error) throw error;

      toast({
        title: t("🚨 SOS отправлен!", "🚨 SOS sent!"),
        description: t("Родители получат уведомление прямо сейчас.", "Your parents will get an alert now."),
      });
    } catch (e) {
      console.error(e);
      toast({
        title: t("Ошибка", "Error"),
        description: t("Не удалось отправить SOS. Попробуй ещё раз.", "Couldn’t send SOS. Try again."),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="lg"
          className={
            big
              ? "rounded-full h-32 w-32 p-0 shadow-2xl animate-pulse flex flex-col items-center justify-center gap-1"
              : "fixed bottom-24 right-4 z-50 rounded-full h-16 w-16 p-0 shadow-2xl animate-pulse"
          }
          aria-label="SOS"
        >
          <AlertOctagon className={big ? "h-12 w-12" : "h-8 w-8"} />
          {big && <span className="text-sm font-bold">SOS</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl text-destructive flex items-center gap-2">
            {t("🚨 Отправить SOS?", "🚨 Send SOS?")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {t("Родителям придёт срочное уведомление с твоим местоположением. Нажимай только если тебе нужна помощь!", "Your parents will get an urgent alert with your location. Tap only if you need help.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Отмена", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={sendSOS}
            disabled={sending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {sending ? t("Отправляем…", "Sending…") : t("Да, помогите!", "Yes, I need help!")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
