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

export const SOSButton = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const sendSOS = async () => {
    if (!user?.id) return;
    setSending(true);

    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => null);
      }

      let lat: number | null = null;
      let lng: number | null = null;
      let acc: number | null = null;

      try {
        const pos = Capacitor.isNativePlatform()
          ? await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
          : await new Promise<GeolocationPosition>((res, rej) =>
              navigator.geolocation.getCurrentPosition(res, rej, {
                enableHighAccuracy: true,
                timeout: 10000,
              })
            );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        acc = pos.coords.accuracy;
      } catch {
        /* location optional */
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
        title: "🚨 SOS отправлен!",
        description: "Родители получат уведомление прямо сейчас.",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить SOS. Попробуй ещё раз.",
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
          className="fixed bottom-24 right-4 z-50 rounded-full h-16 w-16 p-0 shadow-2xl animate-pulse-slow"
          aria-label="SOS"
        >
          <AlertOctagon className="h-8 w-8" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl text-destructive flex items-center gap-2">
            🚨 Отправить SOS?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Родителям придёт срочное уведомление с твоим местоположением.
            Нажимай только если тебе нужна помощь!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={sendSOS}
            disabled={sending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {sending ? "Отправляем…" : "Да, помогите!"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
