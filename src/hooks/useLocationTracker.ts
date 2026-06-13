import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGeoPosition,
  queryGeoPermission,
  type GeoPermissionState,
} from "@/lib/geo-permission";

const DEFAULT_INTERVAL_SEC = 60;

export interface LocationTrackerStatus {
  permission: GeoPermissionState;
  lastSentAt: string | null;
  lastError: string | null;
  intervalSec: number;
  trackingEnabled: boolean;
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

const resolveTrackingChildId = async (authUserId: string): Promise<string | null> => {
  const activeChildId = sessionStorage.getItem("activeChildId");
  if (activeChildId) return activeChildId;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authUserId)
    .maybeSingle();

  return data?.role === "child" ? authUserId : null;
};

export const useLocationTracker = (enabled = true) => {
  const { user } = useAuth();
  const timerRef = useRef<number | null>(null);
  const intervalSecRef = useRef(DEFAULT_INTERVAL_SEC);
  const [childId, setChildId] = useState<string | null>(null);
  const [intervalSec, setIntervalSec] = useState(DEFAULT_INTERVAL_SEC);
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const settingsRef = useRef<Settings | null>(null);
  const lastInsideRef = useRef<boolean | null>(null);
  const lastSentAtRef = useRef<string | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const tickInFlightRef = useRef(false);

  useEffect(() => {
    intervalSecRef.current = intervalSec;
  }, [intervalSec]);

  const publishStatus = async () => {
    const permission = await queryGeoPermission();
    emitStatus({
      permission,
      lastSentAt: lastSentAtRef.current,
      lastError: lastErrorRef.current,
      intervalSec: intervalSecRef.current,
      trackingEnabled: trackingEnabled && !!childId && enabled,
    });
  };

  useEffect(() => {
    if (!user?.id) {
      setChildId(null);
      return;
    }
    let active = true;
    resolveTrackingChildId(user.id).then((id) => {
      if (active) setChildId(id);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!childId) return;
    let active = true;

    const apply = (row: Settings | null) => {
      if (!row) return;
      settingsRef.current = row;
      const sec = Math.max(15, row.location_interval_seconds || DEFAULT_INTERVAL_SEC);
      setIntervalSec(sec);
      intervalSecRef.current = sec;
      setTrackingEnabled(!!row.location_enabled);
    };

    (async () => {
      const { data } = await supabase
        .from("child_settings")
        .select(
          "location_interval_seconds, location_enabled, geofence_enabled, geofence_lat, geofence_lng, geofence_radius_m",
        )
        .eq("child_id", childId)
        .maybeSingle();
      if (!active) return;
      if (data) apply(data as Settings);
      else {
        await supabase.from("child_settings").insert({
          child_id: childId,
          location_interval_seconds: DEFAULT_INTERVAL_SEC,
          location_enabled: true,
        });
      }
      publishStatus();
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

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [childId]);

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

      await supabase.from("geofence_events" as any).insert({
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

    const tick = async () => {
      if (tickInFlightRef.current || cancelled) return;
      if (document.visibilityState === "hidden") return;

      tickInFlightRef.current = true;
      try {
        const maxAge = Math.min(intervalSecRef.current * 1000, 120_000);
        const pos = await getGeoPosition(maxAge, 30_000);

        const { error } = await supabase.from("child_locations").insert([
          {
            child_id: childId,
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

    const startTimer = () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      tick();
      timerRef.current = window.setInterval(tick, intervalSecRef.current * 1000);
    };

    startTimer();

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, childId, intervalSec, trackingEnabled]);

  return { childId, intervalSec, trackingEnabled };
};
