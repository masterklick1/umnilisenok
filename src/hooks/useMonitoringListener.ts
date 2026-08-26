import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { useToast } from "@/hooks/use-toast";
import { getGeoPosition, getCachedGeoPosition } from "@/lib/geo-permission";

interface MonitoringRequest {
  id: string;
  child_id: string;
  request_type: "photo" | "audio" | "location";
  status: string;
}

const processing = new Set<string>();

async function handlePhoto(req: MonitoringRequest, childId: string) {
  let blob: Blob;

  if (Capacitor.isNativePlatform()) {
    try {
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
    } catch (e) {
      console.warn('Plugin error skipped:', e);
      throw new Error("Camera plugin failed");
    }
  } else {
    try {
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
        canvas.toBlob((b) => r(b!), "image/jpeg", 0.6),
      );
      track.stop();
    } catch (e) {
      console.warn('Plugin error skipped:', e);
      throw new Error("getUserMedia failed");
    }
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
  try {
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
  } catch (e) {
    console.warn('Plugin error skipped:', e);
    throw new Error("Audio recording failed");
  }
}

async function handleLocation(req: MonitoringRequest, childId: string) {
  try {
    let pos;
    try {
      pos = await getGeoPosition(0, 45_000, false);
    } catch (e) {
      console.warn('Plugin error skipped:', e);
      const cached = getCachedGeoPosition(900_000);
      if (!cached) throw new Error("GPS не ответил");
      pos = cached;
    }

    const { error: locError } = await supabase.from("child_locations").insert([
      {
        child_id: childId,
        device_source: "phone",
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
      },
    ]);
    if (locError) throw new Error(locError.message);

    const { error: reqError } = await supabase
      .from("monitoring_requests")
      .update({
        status: "fulfilled",
        result_data: {
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          device_source: "phone",
        },
        fulfilled_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    if (reqError) throw new Error(reqError.message);
  } catch (e) {
    console.warn('Plugin error skipped:', e);
    throw e;
  }
}

async function fulfillRequest(req: MonitoringRequest, childId: string) {
  if (processing.has(req.id)) return;
  processing.add(req.id);

  try {
    if (req.request_type === "photo") {
      await handlePhoto(req, childId);
    } else if (req.request_type === "audio") {
      await handleAudio(req, childId);
    } else if (req.request_type === "location") {
      await handleLocation(req, childId);
    }
  } finally {
    processing.delete(req.id);
  }
}

/**
 * Listens for parent's monitoring requests and fulfills them
 * (take photo / record audio / send location).
 * Polls pending queue — Realtime alone misses requests if app was in background.
 */
export const useMonitoringListener = (enabled = true) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!enabled || !user?.id) return;

    const childId = user.id;

    const processRequest = async (req: MonitoringRequest, notify: boolean) => {
      if (req.status !== "pending") return;

      if (notify) {
        toastRef.current({
          title: "👀 Родитель проверяет тебя",
          description:
            req.request_type === "photo"
              ? "Делаем фото"
              : req.request_type === "audio"
                ? "Записываем звук (5 сек)"
                : "Отправляем местоположение",
        });
      }

      try {
        await fulfillRequest(req, childId);
        if (req.request_type === "location") {
          window.dispatchEvent(new CustomEvent("force-location-send"));
        }
      } catch (e) {
        console.error("Monitoring request failed:", e);
        await supabase
          .from("monitoring_requests")
          .update({
            status: "failed",
            fulfilled_at: new Date().toISOString(),
            result_data: { error: e instanceof Error ? e.message : "unknown" },
          })
          .eq("id", req.id);
      }
    };

    const pollPending = async () => {
      try {
        const { data } = await supabase
          .from("monitoring_requests")
          .select("id, child_id, request_type, status")
          .eq("child_id", childId)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(5);

        for (const row of data || []) {
          await processRequest(row as MonitoringRequest, false);
        }
      } catch (e) {
        console.warn('Plugin error skipped:', e);
      }
    };

    pollPending();
    const pollInterval = window.setInterval(pollPending, 12_000);

    const channel = supabase
      .channel(`monitoring-${childId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "monitoring_requests",
          filter: `child_id=eq.${childId}`,
        },
        async (payload) => {
          await processRequest(payload.new as MonitoringRequest, true);
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [enabled, user?.id]);
};
