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
} from "@/lib/geo-permission";
import { registerPlugin } from "@capacitor/core";
import { whenCapacitorReady, isNativePluginAvailable } from "@/lib/native-ready";

// Package has no JS entry (native-only). Register plugin bridge directly so
// web builds don't try to resolve the missing module.
const BackgroundGeolocation = registerPlugin<any>("BackgroundGeolocation");

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
  window.dispatchEvent(new CustomEvent("location-tracker-status", { detail: status }));
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
    trackingEnabledRef.current = trackingEnabled;
  }, [trackingEnabled]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    childIdRef.current = childId;
  }, [childId]);

  const publishStatus = async () => {
    try {
      await whenCapacitorReady();
      const permission = await queryGeoPermission();
      const bgPerm = isBackgroundGeoSupported() ? await queryBackgroundGeoPermission() : "unsupported";
      setBackgroundPermission(bgPerm);
      emitStatus({
        permission,
        backgroundPermission: bgPerm,
        lastSentAt: lastSentAtRef.current,
        lastError: lastErrorRef.current,
        intervalSec: intervalSecRef.current,
        trackingEnabled: trackingEnabledRef.current && !!childIdRef.current && enabledRef.current,
        backgroundTrackingEnabled,
      });
    } catch (e) {
      console.warn("publishStatus failed", e);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setChildId(null);
      return;
    }
    let active = true;

    const resolve = async () => {
      const id = await resolveChildTrackingId(user);
      if (active) setChildId(id);
    };

    resolve();
    const interval = window.setInterval(resolve, 30_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user]);

  const loadSettings = async (id: string) => {
    const { data } = await supabase
      .from("child_settings")
      .select(
        "location_interval_seconds, location_enabled, geofence_enabled, geofence_lat, geofence_lng, geofence_radius_m",
      )
      .eq("child_id", id)
      .maybeSingle();

    if (data) {
      settingsRef.current = data as Settings;
      const sec = Math.max(15, data.location_interval_seconds || DEFAULT_INTERVAL_SEC);
      setIntervalSec(sec);
      intervalSecRef.current = sec;
      setTrackingEnabled(data.location_enabled !== false);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("child_settings")
      .upsert(
        {
          child_id: id,
          location_interval_seconds: DEFAULT_INTERVAL_SEC,
          location_enabled: true,
        },
        { onConflict: "child_id" },
      )
      .select(
        "location_interval_seconds, location_enabled, geofence_enabled, geofence_lat, geofence_lng, geofence_radius_m",
      )
      .maybeSingle();

    if (error) {
      lastErrorRef.current = `Настройки: ${error.message}`;
    } else if (inserted) {
      settingsRef.current = inserted as Settings;
      const sec = Math.max(15, inserted.location_interval_seconds || DEFAULT_INTERVAL_SEC);
      setIntervalSec(sec);
      intervalSecRef.current = sec;
      setTrackingEnabled(inserted.location_enabled !== false);
    }
  };

  useEffect(() => {
    if (!childId) return;
    let active = true;

    const apply = (row: Settings | null) => {
      if (!row) return;
      settingsRef.current = row;
      const sec = Math.max(15, row.location_interval_seconds || DEFAULT_INTERVAL_SEC);
      setIntervalSec(sec);
      intervalSecRef.current = sec;
      setTrackingEnabled(row.location_enabled !== false);
    };

    (async () => {
      await loadSettings(childId);
      if (active) publishStatus();
    })();

    const ch = supabase
      .channel(`child-settings-${childId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "child_settings", filter: `child_id=eq.${childId}` },
        (payload) => {
          apply(payload.new as Settings);
          publishStatus();
        },
      )
      .subscribe();

    settingsPollRef.current = window.setInterval(() => {
      if (active) loadSettings(childId).then(() => publishStatus());
    }, SETTINGS_POLL_MS);

    return () => {
      active = false;
      if (settingsPollRef.current) {
        window.clearInterval(settingsPollRef.current);
        settingsPollRef.current = null;
      }
      supabase.removeChannel(ch);
    };
  }, [childId]);

  // Фоновая геолокация через Foreground Service + постоянное уведомление в шторке
  const startBackgroundTracking = async (id: string, _intervalSeconds: number) => {
    if (!BackgroundGeolocation) return;

    try {
      await whenCapacitorReady();
      if (!isNativePluginAvailable("BackgroundGeolocation")) return;

      if (backgroundWatcherRef.current) {
        try {
          await BackgroundGeolocation.removeWatcher({ id: backgroundWatcherRef.current });
        } catch {
          /* watcher may already be gone */
        }
        backgroundWatcherRef.current = null;
      }

      // Android 14+ throws SecurityException (process crash on some OEMs) if a
      // location FGS is started before ACCESS_FINE_LOCATION is granted.
      // Auto-start must not prompt; settings button requests permissions.
      const geoPerm = await queryGeoPermission();
      const bgPerm = await queryBackgroundGeoPermission();
      if (geoPerm !== "granted" && bgPerm !== "always") {
        setBackgroundTrackingEnabled(false);
        return;
      }

      await ensureLocationNotificationPermission();

      const watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: BG_GEO_NOTIFICATION_TITLE,
          backgroundMessage: BG_GEO_NOTIFICATION_TEXT,
          requestPermissions: false,
          stale: false,
          distanceFilter: 0,
        },
        async (location: any, error: any) => {
          if (error) {
            lastErrorRef.current = error?.message || "Ошибка фонового трекера";
            publishStatus();
            return;
          }
          if (!location) return;
          try {
            const { error: insertError } = await supabase.from("child_locations").insert([
              {
                child_id: id,
                device_source: "phone_background",
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy ?? null,
              },
            ]);

            if (!insertError) {
              lastSentAtRef.current = new Date().toISOString();
              lastErrorRef.current = null;

              const s = settingsRef.current;
              if (s?.geofence_enabled && s.geofence_lat != null && s.geofence_lng != null) {
                const radius = s.geofence_radius_m || 300;
                const d = distanceM(location.latitude, location.longitude, s.geofence_lat, s.geofence_lng);
                const inside = d <= radius;
                const prev = lastInsideRef.current;
                lastInsideRef.current = inside;
                if (prev !== null && prev !== inside) {
                  await supabase.from("geofence_events").insert({
                    child_id: id,
                    event_type: inside ? "enter" : "exit",
                    latitude: location.latitude,
                    longitude: location.longitude,
                    distance_m: d,
                  });
                }
              }
            } else {
              lastErrorRef.current = insertError.message;
            }
          } catch (e) {
            lastErrorRef.current = e instanceof Error ? e.message : "Ошибка фоновой геолокации";
          }
          publishStatus();
        },
      );

      backgroundWatcherRef.current = watcherId;
      lastErrorRef.current = null;
      setBackgroundTrackingEnabled(true);
      publishStatus();
    } catch (e) {
      lastErrorRef.current = e instanceof Error ? e.message : "Не удалось запустить фоновый трекинг";
      setBackgroundTrackingEnabled(false);
      publishStatus();
    }
  };

  const stopBackgroundTracking = async () => {
    if (!BackgroundGeolocation) return;

    try {
      if (backgroundWatcherRef.current) {
        await BackgroundGeolocation.removeWatcher({ id: backgroundWatcherRef.current });
        backgroundWatcherRef.current = null;
      }
      setBackgroundTrackingEnabled(false);
      publishStatus();
    } catch (e) {
      console.warn("Error stopping background tracking:", e);
    }
  };

  // Фоновое отслеживание (включается параллельно с переднеплановым)
  useEffect(() => {
    if (!enabled || !childId || !trackingEnabled || !isBackgroundGeoSupported()) {
      stopBackgroundTracking();
      return;
    }

    const startIfPermitted = async () => {
      try {
        await whenCapacitorReady();
        await startBackgroundTracking(childId, intervalSecRef.current);
      } catch (e) {
        console.warn("background tracking start failed", e);
      }
    };

    startIfPermitted();

    const onRestart = () => {
      void startBackgroundTracking(childId, intervalSecRef.current).catch((e) => {
        console.warn("background tracking restart failed", e);
      });
    };
    window.addEventListener(BACKGROUND_GEO_RESTART_EVENT, onRestart);

    return () => {
      window.removeEventListener(BACKGROUND_GEO_RESTART_EVENT, onRestart);
      stopBackgroundTracking();
    };
  }, [enabled, childId, trackingEnabled]);

  // Переднеплановое отслеживание (работает, пока приложение открыто)
  useEffect(() => {
    if (!enabled || !childId || !trackingEnabled) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      publishStatus();
      return;
    }

    let cancelled = false;
    startGeoWatch();

    const checkGeofence = async (lat: number, lng: number) => {
      const s = settingsRef.current;
      if (!s?.geofence_enabled || s.geofence_lat == null || s.geofence_lng == null) {
        lastInsideRef.current = null;
        return;
      }
      const radius = s.geofence_radius_m || 300;
      const d = distanceM(lat, lng, s.geofence_lat, s.geofence_lng);
      const inside = d <= radius;
      const prev = lastInsideRef.current;
      lastInsideRef.current = inside;
      if (prev === null || prev === inside) return;

      await supabase.from("geofence_events").insert({
        child_id: childId,
        event_type: inside ? "enter" : "exit",
        latitude: lat,
        longitude: lng,
        distance_m: d,
      });
      supabase.functions
        .invoke("notify-geofence", { body: { event_type: inside ? "enter" : "exit", distance_m: d } })
        .catch(() => {});
    };

    const obtainPosition = async (forceFresh: boolean) => {
      const maxAge = Math.max(intervalSecRef.current * 1000, 120_000);
      if (!forceFresh) {
        const cached = getCachedGeoPosition(maxAge * 2);
        if (cached) return cached;
      }
      return getGeoPosition(maxAge, 45_000, !forceFresh);
    };

    const tick = async (force = false) => {
      if (tickInFlightRef.current || cancelled) return;

      tickInFlightRef.current = true;
      try {
        const pos = await obtainPosition(force);

        const { error } = await supabase.from("child_locations").insert([
          {
            child_id: childId,
            device_source: "phone",
            latitude: pos.latitude,
            longitude: pos.longitude,
            accuracy: pos.accuracy,
          },
        ]);

        if (error) throw new Error(error.message);

        lastSentAtRef.current = new Date().toISOString();
        lastErrorRef.current = null;
        await checkGeofence(pos.latitude, pos.longitude);
      } catch (e) {
        lastErrorRef.current = e instanceof Error ? e.message : "Ошибка геолокации";
        console.warn("Location tick failed:", lastErrorRef.current);
      } finally {
        tickInFlightRef.current = false;
        publishStatus();
      }
    };

    tick(true);
    timerRef.current = window.setInterval(() => tick(false), intervalSecRef.current * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") tick(true);
    };
    document.addEventListener("visibilitychange", onVisible);

    const onForceSend = () => tick(true);
    window.addEventListener("force-location-send", onForceSend);

    return () => {
      cancelled = true;
      stopGeoWatch();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("force-location-send", onForceSend);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, childId, intervalSec, trackingEnabled]);

  return {
    childId,
    intervalSec,
    trackingEnabled,
    backgroundTrackingEnabled,
    backgroundPermission,
    requestBackgroundPermission: requestBackgroundGeoPermission,
    isBackgroundSupported: isBackgroundGeoSupported(),
  };
};
