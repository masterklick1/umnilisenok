import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

const DEFAULT_INTERVAL_SEC = 60;

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

/** Resolve which child account should send location (own phone or play-here session). */
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

/**
 * Periodically writes child's geo-position to DB and emits geofence_events
 * when crossing the safe zone boundary.
 */
export const useLocationTracker = (enabled = true) => {
  const { user } = useAuth();
  const timerRef = useRef<number | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [intervalSec, setIntervalSec] = useState<number>(DEFAULT_INTERVAL_SEC);
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(true);
  const settingsRef = useRef<Settings | null>(null);
  const lastInsideRef = useRef<boolean | null>(null);

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
      setIntervalSec(Math.max(15, row.location_interval_seconds || DEFAULT_INTERVAL_SEC));
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
      if (data) {
        apply(data as Settings);
      } else {
        await supabase.from("child_settings").insert({
          child_id: childId,
          location_interval_seconds: DEFAULT_INTERVAL_SEC,
          location_enabled: true,
        });
      }
    })();

    const ch = supabase
      .channel(`child-settings-${childId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "child_settings", filter: `child_id=eq.${childId}` },
        (payload) => apply(payload.new as Settings),
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
      return;
    }

    let cancelled = false;

    const ensurePermission = async () => {
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== "granted") {
          const req = await Geolocation.requestPermissions();
          return req.location === "granted";
        }
        return true;
      }
      return "geolocation" in navigator;
    };

    const getPosition = async (): Promise<GeolocationPosition | null> => {
      try {
        if (Capacitor.isNativePlatform()) {
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15_000,
          });
          return {
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
          } as unknown as GeolocationPosition;
        }
        return await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve(p),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 15_000 },
          );
        });
      } catch {
        return null;
      }
    };

    const checkGeofence = async (lat: number, lng: number) => {
      const s = settingsRef.current;
      if (!s || !s.geofence_enabled || s.geofence_lat == null || s.geofence_lng == null) {
        lastInsideRef.current = null;
        return;
      }
      const radius = s.geofence_radius_m || 300;
      const d = distanceM(lat, lng, s.geofence_lat, s.geofence_lng);
      const inside = d <= radius;
      const prev = lastInsideRef.current;
      lastInsideRef.current = inside;
      if (prev === null) return;
      if (prev === inside) return;
      await supabase.from("geofence_events" as any).insert({
        child_id: childId,
        event_type: inside ? "enter" : "exit",
        latitude: lat,
        longitude: lng,
        distance_m: d,
      });
      supabase.functions
        .invoke("notify-geofence", {
          body: { event_type: inside ? "enter" : "exit", distance_m: d },
        })
        .catch((e) => console.error("notify-geofence failed", e));
    };

    const tick = async () => {
      const pos = await getPosition();
      if (!pos || cancelled) return;
      const { error } = await supabase.from("child_locations").insert([
        {
          child_id: childId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        },
      ]);
      if (error) console.error("Location insert error:", error.message);
      await checkGeofence(pos.coords.latitude, pos.coords.longitude);
    };

    (async () => {
      const ok = await ensurePermission();
      if (!ok || cancelled) return;
      await tick();
      timerRef.current = window.setInterval(tick, intervalSec * 1000);
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, childId, intervalSec, trackingEnabled]);
};
