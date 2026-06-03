import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { useToast } from "@/hooks/use-toast";

interface MonitoringRequest {
  id: string;
  child_id: string;
  request_type: "photo" | "audio" | "location";
  status: string;
}

/**
 * Listens for parent's monitoring requests and fulfills them
 * (take photo / record audio / send location).
 * Always notifies the child first — no silent surveillance.
 */
export const useMonitoringListener = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`monitoring-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "monitoring_requests",
          filter: `child_id=eq.${user.id}`,
        },
        async (payload) => {
          const req = payload.new as MonitoringRequest;
          if (req.status !== "pending") return;

          toast({
            title: "👀 Родитель проверяет тебя",
            description:
              req.request_type === "photo"
                ? "Делаем фото"
                : req.request_type === "audio"
                ? "Записываем звук (5 сек)"
                : "Отправляем местоположение",
          });

          try {
            if (req.request_type === "photo") {
              await handlePhoto(req, user.id);
            } else if (req.request_type === "audio") {
              await handleAudio(req, user.id);
            } else if (req.request_type === "location") {
              await handleLocation(req, user.id);
            }
          } catch (e) {
            console.error("Monitoring request failed:", e);
            await supabase
              .from("monitoring_requests")
              .update({ status: "failed", fulfilled_at: new Date().toISOString() })
              .eq("id", req.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);
};

async function handlePhoto(req: MonitoringRequest, childId: string) {
  let blob: Blob;

  if (Capacitor.isNativePlatform()) {
    const photo = await Camera.getPhoto({
      quality: 60,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });
    if (!photo.base64String) throw new Error("No photo data");
    const bin = atob(photo.base64String);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    blob = new Blob([arr], { type: "image/jpeg" });
  } else {
    // Web fallback: capture from webcam
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const track = stream.getVideoTracks()[0];
    const video = document.createElement("video");
    video.srcObject = stream;
    await video.play();
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    blob = await new Promise<Blob>((r) =>
      canvas.toBlob((b) => r(b!), "image/jpeg", 0.6)
    );
    track.stop();
  }

  const path = `${childId}/photo-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("monitoring").upload(path, blob, {
    contentType: "image/jpeg",
  });
  if (error) throw error;

  await supabase
    .from("monitoring_requests")
    .update({
      status: "fulfilled",
      result_path: path,
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", req.id);
}

async function handleAudio(req: MonitoringRequest, childId: string) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    recorder.start();
    setTimeout(() => recorder.stop(), 5000);
  });
  stream.getTracks().forEach((t) => t.stop());

  const blob = new Blob(chunks, { type: "audio/webm" });
  const path = `${childId}/audio-${Date.now()}.webm`;
  const { error } = await supabase.storage.from("monitoring").upload(path, blob, {
    contentType: "audio/webm",
  });
  if (error) throw error;

  await supabase
    .from("monitoring_requests")
    .update({
      status: "fulfilled",
      result_path: path,
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", req.id);
}

async function handleLocation(req: MonitoringRequest, childId: string) {
  const pos = await new Promise<GeolocationPosition>((res, rej) =>
    navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true })
  );
  await supabase.from("child_locations").insert([
    {
      child_id: childId,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    },
  ]);
  await supabase
    .from("monitoring_requests")
    .update({
      status: "fulfilled",
      result_data: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      },
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", req.id);
}
