import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveChildTrackingId } from "@/lib/resolve-user-role";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { LocalNotifications } from "@capacitor/local-notifications";

interface MonitoringRequest {
  id: string;
  child_id: string;
  request_type: "photo" | "audio" | "location";
  status: "pending" | "fulfilled" | "failed";
}

export const MONITORING_CONSENT_KEY = "monitoring-consent-acknowledged-v1";

export const hasMonitoringConsent = (): boolean => {
  return true; // Автоматически подтверждаем согласие
};

const MONITORING_NOTIFICATION_CHANNEL_ID = "monitoring-active";

const notifyMonitoringActive = async (kind: "photo" | "audio") => {
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;

    try {
      await LocalNotifications.createChannel({
        id: MONITORING_NOTIFICATION_CHANNEL_ID,
        name: "Проверка безопасности",
        description: "Показывается, когда родитель запрашивает фото или звук с устройства",
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: false,
      });
    } catch (e) {
      console.warn("Failed to create monitoring channel:", e);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Date.now() % 2147483647),
          channelId: MONITORING_NOTIFICATION_CHANNEL_ID,
          title: "🛡️ Проверка безопасности",
          body:
            kind === "photo"
              ? "Родитель запросил фото с камеры устройства"
              : "Родитель запросил короткую запись звука",
        },
      ],
    });
  } catch (e) {
    console.warn("Failed to show monitoring notification:", e);
  }
};

const recordAudio = async (durationMs: number): Promise<Blob | null> => {
  try {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      console.warn("MediaDevices API not available");
      return null;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.start();

      await new Promise((resolve) => setTimeout(resolve, durationMs));

      return await new Promise<Blob | null>((resolve) => {
        recorder.onstop = () => {
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
          resolve(chunks.length > 0 ? new Blob(chunks, { type: "audio/webm" }) : null);
        };
        recorder.stop();
      });
    } catch (err) {
      console.warn("Audio recording stream failed:", err);
      if (stream) {
        (stream as MediaStream).getTracks().forEach((track) => track.stop());
      }
      return null;
    }
  } catch (err) {
    console.warn("recordAudio outer catch:", err);
    return null;
  }
};

const takePhoto = async (facingMode: "user" | "environment" = "user"): Promise<Blob | null> => {
  let stream: MediaStream | null = null;
  try {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      console.warn("Camera stream API not available");
      return null;
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;

    await new Promise<void>((resolve) => {
      const done = () => resolve();
      video.onloadedmetadata = done;
      window.setTimeout(done, 3000);
    });

    try {
      await video.play();
    } catch (e) {
      console.warn("Photo capture: play failed:", e);
    }

    await new Promise((r) => setTimeout(r, 600));

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
    });
  } catch (err) {
    console.warn("Photo capture failed:", err);
    return null;
  } finally {
    try {
      stream?.getTracks().forEach((t) => t.stop());
    } catch (e) {
      console.warn("Failed to stop camera stream:", e);
    }
  }
};

export const prewarmMonitoringPermissions = async (): Promise<void> => {
  try {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const status = await Camera.checkPermissions();
      if (status.camera !== "granted") {
        await Camera.requestPermissions({ permissions: ["camera"] });
      }
    } catch (e) {
      console.warn("Camera permission prewarm skipped:", e);
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
      console.warn("Mic permission prewarm skipped:", e);
    }

    try {
      if (Capacitor.getPlatform() === "android") {
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
      }
    } catch (e) {
      console.warn("Notification permission prewarm skipped:", e);
    }
  } catch (e) {
    console.warn("prewarmMonitoringPermissions failed:", e);
  }
};

export const useMonitoringListener = (enabled: boolean = true) => {
  const { user } = useAuth();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !user?.id) return;

    let active = true;

    const setupListener = async () => {
      try {
        const childId = await resolveChildTrackingId(user);
        if (!childId || !active) return;

        try {
          localStorage.setItem(MONITORING_CONSENT_KEY, "1");
        } catch (e) {}

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
              if (!active) return;

              const req = payload.new as MonitoringRequest;
              if (!req.id) return;

              let blob: Blob | null = null;
              let dataUrl: string | null = null;
              let locationData: { latitude: number; longitude: number; accuracy: number } | null = null;

              if (req.request_type === "audio") {
                try {
                  await notifyMonitoringActive("audio");
                  blob = await recordAudio(5000);
                } catch (err) {
                  console.warn("Audio capture failed:", err);
                }
              } else if (req.request_type === "photo") {
                try {
                  await notifyMonitoringActive("photo");
                  blob = await takePhoto();
                } catch (err) {
                  console.warn("Photo capture failed:", err);
                }
              } else if (req.request_type === "location") {
                try {
                  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                      enableHighAccuracy: true,
                      timeout: 15000,
                    });
                  });
                  locationData = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                  };
                } catch (err) {
                  console.warn("Location capture failed:", err);
                }
              }

              let resultPath: string | null = null;
              if (blob) {
                try {
                  dataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = () => resolve("");
                    reader.readAsDataURL(blob!);
                  });

                  const ext = req.request_type === "photo" ? "jpg" : "webm";
                  const path = `${req.child_id}/${req.id}.${ext}`;
                  const { error: upErr } = await supabase.storage
                    .from("monitoring")
                    .upload(path, blob, { contentType: blob.type || undefined, upsert: true });

                  if (!upErr) {
                    resultPath = path;
                  }
                } catch (e) {
                  console.warn("Storage upload failed, falling back to base64 dataUrl:", e);
                }
              }

              const success = Boolean(resultPath || dataUrl || locationData);

              try {
                await supabase
                  .from("monitoring_requests")
                  .update({
                    status: success ? "fulfilled" : "failed",
                    result_path: resultPath,
                    result_data: locationData ?? (dataUrl ? { data_url: dataUrl } : null),
                    fulfilled_at: new Date().toISOString(),
                  })
                  .eq("id", req.id);
              } catch (err) {
                console.warn("Failed to update status:", err);
              }
            }
          )
          .subscribe();

        if (active) {
          unsubscribeRef.current = () => {
            try {
              supabase.removeChannel(channel);
            } catch (e) {
              console.warn("Failed to remove channel:", e);
            }
          };
        }
      } catch (err) {
        console.warn("setupListener failed:", err);
      }
    };

    void setupListener();

    return () => {
      active = false;
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch (e) {}
      }
    };
  }, [enabled, user?.id]);
};
