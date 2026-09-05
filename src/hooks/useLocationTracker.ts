import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveChildTrackingId } from "@/lib/resolve-user-role";
import {
  getCachedGeoPosition,
  getGeoPosition,
  queryGeoPermission,
  queryBackgroundGeoPermission,
  requestBackgroundGeoPermission,
  startGeoWatch,
  stopGeoWatch,
  type GeoPermissionState,
  type BackgroundGeoPermissionState,
  isBackgroundGeoSupported,
  ensureLocationNotificationPermission,
  BG_GEO_NOTIFICATION_TITLE,
  BG_GEO_NOTIFICATION_TEXT,
  BACKGROUND_GEO_RESTART_EVENT,
  getBackgroundGeolocation,
} from "@/lib/geo-permission";
import { Capacitor } from "@capacitor/core";
import { whenCapacitorReady, isNativePluginAvailable } from "@/lib/native-ready";

const DEFAULT_INTERVAL_SEC = 60;
const SETTINGS_POLL_MS = 30_000;

export interface LocationTrackerStatus {
  permission: GeoPermissionState;
  backgroundPermission: BackgroundGeoPermissionState;
  lastSentAt: string | null;
  lastError: string | null;
  intervalSec: number;
  trackingEnabled: boolean;
  backgroundTrackingEnabled: boolean;
}

interface Settings {
  location_interval_seconds: number;
  location_enabled: boolean;
  geofence_enabled: boolean;
  geofence_lat: number | null;
  geofence_lng: number | null;
  geofence_radius_m: number | null;
}

const distanceM = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const emitStatus = (status: LocationTrackerStatus) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("location-tracker-status", { detail: status }));
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Failed to emit status:", e);
  }
};

export const useLocationTracker = (enabled = true) => {
  const { user } = useAuth();
  const timerRef = useRef<number | null>(null);
  const settingsPollRef = useRef<number | null>(null);
  const intervalSecRef = useRef(DEFAULT_INTERVAL_SEC);
  const [childId, setChildId] = useState<string | null>(null);
  const [intervalSec, setIntervalSec] = useState(DEFAULT_INTERVAL_SEC);
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] = useState(false);
  const [backgroundPermission, setBackgroundPermission] = useState<BackgroundGeoPermissionState>("prompt");
  const settingsRef = useRef<Settings | null>(null);
  const lastInsideRef = useRef<boolean | null>(null);
  const lastSentAtRef = useRef<string | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const tickInFlightRef = useRef(false);
  const trackingEnabledRef = useRef(true);
  const enabledRef = useRef(enabled);
  const childIdRef = useRef<string | null>(null);
  const backgroundWatcherRef = useRef<string | null>(null);

  useEffect(() => {
    intervalSecRef.current = intervalSec;
  }, [intervalSec]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Init & resolve child ID
  useEffect(() => {
    if (!user?.id || !enabled) return;

    let active = true;

    const init = async () => {
      try {
        const id = await resolveChildTrackingId(user);
        if (active) {
          setChildId(id);
          childIdRef.current = id;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to resolve child ID:", e);
        if (active) {
          setChildId(null);
        }
      }
    };

    void init();
    return () => {
      active = false;
    };
  }, [user?.id, enabled]);

  // Poll settings
  useEffect(() => {
    if (!childId || !enabled) return;

    let active = true;

    const pollSettings = async () => {
      try {
        const { data } = await supabase
          .from("child_settings")
          .select("*")
          .eq("child_id", childId)
          .single();

        if (active && data) {
          settingsRef.current = data as Settings;
          setTrackingEnabled(data.location_enabled ?? true);
          setIntervalSec(data.location_interval_seconds ?? DEFAULT_INTERVAL_SEC);
          setBackgroundTrackingEnabled(data.geofence_enabled ?? false);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to poll settings:", e);
      }
    };

    void pollSettings();
    const interval = window.setInterval(pollSettings, SETTINGS_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [childId, enabled]);

  const publishStatus = () => {
    emitStatus({
      permission: "prompt",
      backgroundPermission,
      lastSentAt: lastSentAtRef.current,
      lastError: lastErrorRef.current,
      intervalSec: intervalSecRef.current,
      trackingEnabled: trackingEnabledRef.current,
      backgroundTrackingEnabled,
    });
  };

  const tick = async (force = false) => {
    if (!trackingEnabledRef.current || !childIdRef.current) return;
    if (tickInFlightRef.current && !force) return;

    tickInFlightRef.current = true;

    try {
      try {
        const pos = await getGeoPosition(120_000, 45_000, !force);
        if (!pos) {
          lastErrorRef.current = "No position";
          publishStatus();
          return;
        }

        // Check geofence if enabled
        if (settingsRef.current?.geofence_enabled && settingsRef.current?.geofence_lat) {
          const dist = distanceM(
            pos.latitude,
            pos.longitude,
            settingsRef.current.geofence_lat,
            settingsRef.current.geofence_lng!,
          );
          const inside = dist <= (settingsRef.current.geofence_radius_m ?? 100);

          if (inside !== lastInsideRef.current) {
            lastInsideRef.current = inside;
            try {
              // Таблица child_place_status отсутствует в сгенерированных типах.
              await (supabase as any).from("child_place_status").upsert({
                child_id: childIdRef.current,
                inside,
                detected_at: new Date().toISOString(),
              });
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn("Geofence insert failed:", e);
            }
          }
        }

        // Always upsert location
        try {
          await supabase.from("child_locations").insert([
            {
              child_id: childIdRef.current,
              device_source: "phone_web",
              latitude: pos.latitude,
              longitude: pos.longitude,
              accuracy: pos.accuracy,
            },
          ]);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("Location insert failed:", e);
        }

        lastSentAtRef.current = new Date().toISOString();
        lastErrorRef.current = null;
      } catch (posErr) {
        lastErrorRef.current = (posErr as Error).message || "Position error";
      }

      publishStatus();
    } finally {
      tickInFlightRef.current = false;
    }
  };

  // Location tracking loop
  useEffect(() => {
    if (!enabled || !childId) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      return;
    }

    trackingEnabledRef.current = trackingEnabled;

    const scheduleNext = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void tick().then(scheduleNext);
      }, intervalSecRef.current * 1000);
    };

    void tick().then(scheduleNext);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, childId, trackingEnabled]);

  // Background geo watcher
  useEffect(() => {
    if (!enabled || !childId || !Capacitor.isNativePlatform()) return;

    let active = true;

    const setupBackgroundGeo = async () => {
      try {
        await whenCapacitorReady();
        if (!active) return;

        try {
          await ensureLocationNotificationPermission();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("Notification permission setup failed:", e);
        }

        if (!active) return;

        try {
          const bgGeo = getBackgroundGeolocation();
          if (!bgGeo) {
            setBackgroundPermission("unsupported");
            return;
          }

          try {
            const perm = await bgGeo.checkPermissions();
            const status = (perm?.location === "granted" || perm?.location === "always") ? "always" : "prompt";
            if (active) setBackgroundPermission(status);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("Background geo permission check failed:", e);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("Background geolocation setup failed:", e);
        }

        if (!active || !backgroundTrackingEnabled) return;

        try {
          const bgGeo = getBackgroundGeolocation();
          if (!bgGeo) return;

          if (backgroundWatcherRef.current) {
            try {
              await bgGeo.removeWatcher({ id: backgroundWatcherRef.current });
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn("Failed to remove old watcher:", e);
            }
            backgroundWatcherRef.current = null;
          }

          try {
            const watcherId = await bgGeo.addWatcher(
              {
                backgroundTitle: BG_GEO_NOTIFICATION_TITLE,
                backgroundMessage: BG_GEO_NOTIFICATION_TEXT,
                requestPermissions: false,
                stale: false,
                distanceFilter: 0,
              },
              async (location: any, error: any) => {
                if (!active || !childIdRef.current) return;

                if (error) {
                  lastErrorRef.current = error?.message || "Background tracker error";
                  publishStatus();
                  return;
                }

                if (!location) return;

                try {
                  await supabase.from("child_locations").insert([
                    {
                      child_id: childIdRef.current,
                      device_source: "phone_background",
                      latitude: location.latitude,
                      longitude: location.longitude,
                      accuracy: location.accuracy ?? null,
                    },
                  ]);
                  lastSentAtRef.current = new Date().toISOString();
                  lastErrorRef.current = null;
                  publishStatus();
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.warn("Background location insert failed:", e);
                  lastErrorRef.current = (e as Error).message || "Insert error";
                  publishStatus();
                }
              },
            );

            if (active) backgroundWatcherRef.current = watcherId;
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("Failed to add background watcher:", e);
            lastErrorRef.current = (e as Error).message || "Watcher error";
            publishStatus();
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("Background geo watcher setup failed:", e);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("setupBackgroundGeo failed:", e);
      }
    };

    void setupBackgroundGeo();

    return () => {
      active = false;
      if (backgroundWatcherRef.current && Capacitor.isNativePlatform()) {
        const bgGeo = getBackgroundGeolocation();
        if (bgGeo) {
          try {
            void bgGeo.removeWatcher({ id: backgroundWatcherRef.current });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("Failed to remove watcher on cleanup:", e);
          }
        }
      }
    };
  }, [enabled, childId, backgroundTrackingEnabled]);

  // Force send listener
  useEffect(() => {
    if (!enabled) return;

    const onForceSend = () => {
      try {
        void tick(true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Force send failed:", e);
      }
    };

    window.addEventListener("force-location-send", onForceSend);
    window.addEventListener(BACKGROUND_GEO_RESTART_EVENT, onForceSend);

    return () => {
      window.removeEventListener("force-location-send", onForceSend);
      window.removeEventListener(BACKGROUND_GEO_RESTART_EVENT, onForceSend);
    };
  }, [enabled]);

  return {
    childId,
    trackingEnabled,
    backgroundTrackingEnabled,
    backgroundPermission,
    requestBackgroundPermission: requestBackgroundGeoPermission,
    isBackgroundSupported: isBackgroundGeoSupported(),
  };
};
