import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { LocalNotifications } from "@capacitor/local-notifications";

interface MonitoringRequest {
  id: string;
  child_id: string;
  request_type: "photo" | "audio" | "location";
  status: "pending" | "fulfilled" | "failed";
}

/** Разовое согласие на устройстве ребёнка — без него команды камеры/микрофона не выполняются. */
export const MONITORING_CONSENT_KEY = "monitoring-consent-acknowledged-v1";

export const hasMonitoringConsent = (): boolean => {
  try {
    return localStorage.getItem(MONITORING_CONSENT_KEY) === "1";
  } catch {
    return false;
  }
};

const MONITORING_NOTIFICATION_CHANNEL_ID = "monitoring-active";

/**
 * Видимое уведомление в шторке в момент реального доступа к камере/микрофону.
 * Не может быть отключено ребёнком и не зависит от того, открыт ли экран приложения —
 * это и есть та самая индикация «идёт проверка», без которой доступ к камере/микрофону
 * на детском устройстве недопустим ни при каких обстоятельствах.
 */
const notifyMonitoringActive = async (kind: "photo" | "audio") => {
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return; // не запрашиваем тут — это делает prewarm заранее

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
      // eslint-disable-next-line no-console
      console.warn("Failed to create monitoring channel:", e);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Date.now() % 2147483647),
          channelId: MONITORING_NOTIFICATION_CHANNEL_ID,
          title: "🛡️ Умный Лисёнок — проверка безопасности",
          body:
            kind === "photo"
              ? "Родитель запросил фото с камеры устройства"
              : "Родитель запросил короткую запись звука",
        },
      ],
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Failed to show monitoring notification:", e);
  }
};

const recordAudio = async (durationMs: number): Promise<Blob | null> => {
  try {
    // Check if MediaDevices API is available
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      // eslint-disable-next-line no-console
      console.warn("MediaDevices API not available");
      return null;
    }

    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];

      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        try {
          chunks.push(e.data);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("Failed to push audio chunk:", err);
        }
      };

      await new Promise<void>((resolve) => {
        try {
          if (!recorder) return resolve();
          recorder.onstop = () => resolve();
          recorder.start();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("Failed to start recorder:", err);
          resolve();
        }
      });

      await new Promise((resolve) => setTimeout(resolve, durationMs));

      try {
        if (recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to stop recorder:", err);
      }

      return chunks.length > 0 ? new Blob(chunks, { type: "audio/webm" }) : null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Audio recording failed:", err);
      return null;
    } finally {
      // Clean up stream
      if (stream) {
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("Failed to stop stream:", err);
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("recordAudio outer catch:", err);
    return null;
  }
};

/**
 * Снимок кадра с камеры: берём видеопоток, снимаем один кадр в canvas и сразу
 * закрываем поток. Перед вызовом обязательно должно быть показано локальное
 * уведомление (см. notifyMonitoringActive) — без него эта функция не вызывается.
 */
const takePhoto = async (facingMode: "user" | "environment" = "user"): Promise<Blob | null> => {
  let stream: MediaStream | null = null;
  try {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.warn("Photo capture: play failed:", e);
    }

    // Даём сенсору кадр-другой на экспозицию.
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
    // eslint-disable-next-line no-console
    console.warn("Photo capture failed:", err);
    return null;
  } finally {
    try {
      stream?.getTracks().forEach((t) => t.stop());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to stop camera stream:", e);
    }
  }
};

/**
 * Разовый предварительный запрос разрешений камеры/микрофона и уведомлений на устройстве
 * ребёнка — вызывается ТОЛЬКО после явного согласия в MonitoringConsentModal, чтобы дальше
 * не показывать системный запрос на каждую отдельную команду.
 */
export const prewarmMonitoringPermissions = async (): Promise<void> => {
  try {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const status = await Camera.checkPermissions();
      if (status.camera !== "granted") {
        await Camera.requestPermissions({ permissions: ["camera"] });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Camera permission prewarm skipped:", e);
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.warn("Notification permission prewarm skipped:", e);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("prewarmMonitoringPermissions failed:", e);
  }
};

export const useMonitoringListener = (enabled: boolean = true) => {
  const { user } = useAuth();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !user?.id) return;

    let active = true;

    const setupListener = () => {
      try {
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
              if (!active) return;

              const req = payload.new as MonitoringRequest;
              if (!req.id) return;

              try {
                // Без разового согласия на устройстве ребёнка команды камеры/микрофона
                // не выполняются вообще — это не «спросить каждый раз», а жёсткий стоп.
                if (
                  (req.request_type === "photo" || req.request_type === "audio") &&
                  !hasMonitoringConsent()
                ) {
                  try {
                    await supabase
                      .from("monitoring_requests")
                      .update({
                        status: "failed",
                        fulfilled_at: new Date().toISOString(),
                      })
                      .eq("id", req.id);
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.warn("Failed to mark request as failed (no consent):", err);
                  }
                  return;
                }

                let blob: Blob | null = null;
                let dataUrl: string | null = null;

                // Execute monitoring action with full error protection
                if (req.request_type === "audio") {
                  try {
                    await notifyMonitoringActive("audio");
                    blob = await recordAudio(5000);
                    if (blob) {
                      dataUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            resolve(reader.result as string);
                          } catch (e) {
                            // eslint-disable-next-line no-console
                            console.warn("FileReader failed:", e);
                            resolve("");
                          }
                        };
                        reader.onerror = () => resolve("");
                        reader.readAsDataURL(blob!);
                      });
                    }
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.warn("Audio capture failed:", err);
                  }
                } else if (req.request_type === "photo") {
                  try {
                    await notifyMonitoringActive("photo");
                    blob = await takePhoto();
                    if (blob) {
                      dataUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            resolve(reader.result as string);
                          } catch (e) {
                            // eslint-disable-next-line no-console
                            console.warn("FileReader failed:", e);
                            resolve("");
                          }
                        };
                        reader.onerror = () => resolve("");
                        reader.readAsDataURL(blob!);
                      });
                    }
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.warn("Photo capture failed:", err);
                  }
                }

                // Mark as completed/failed regardless of capture success
                try {
                  await supabase
                    .from("parent_monitoring_requests")
                    .update({
                      status: dataUrl ? "completed" : "failed",
                      data_url: dataUrl || null,
                      completed_at: new Date().toISOString(),
                    })
                    .eq("id", req.id);
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.warn("Failed to update monitoring request status:", err);
                }
              } catch (err) {
                // eslint-disable-next-line no-console
                console.warn("Monitoring request processing failed:", err);
              }
            },
          )
          .subscribe((status) => {
            if (status === "CLOSED") {
              // eslint-disable-next-line no-console
              console.warn("Monitoring subscription closed");
            }
          });

        if (active) {
          unsubscribeRef.current = () => {
            try {
              supabase.removeChannel(channel);
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn("Failed to remove monitoring channel:", e);
            }
          };
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("setupListener failed:", err);
      }
    };

    try {
      setupListener();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("useMonitoringListener setup failed:", err);
    }

    return () => {
      active = false;
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("Failed to unsubscribe from monitoring:", e);
        }
      }
    };
  }, [enabled, user?.id]);
};
