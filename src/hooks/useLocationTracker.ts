import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

const DEFAULT_INTERVAL_SEC = 60;

/**
 * Periodically writes child's geo-position to DB so parents can see it on a map.
 * Reads `child_settings` for interval and enabled flag, and subscribes to
 * realtime updates so the parent can change interval remotely.
 */
export const useLocationTracker = (enabled = true) => {
  const { user } = useAuth();
  const timerRef = useRef<number | null>(null);
  const [intervalSec, setIntervalSec] = useState<number>(DEFAULT_INTERVAL_SEC);
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(true);

  // Load current settings + subscribe to changes
  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    const apply = (row: { location_interval_seconds: number; location_enabled: boolean } | null) => {
      if (!row) return;
      setIntervalSec(Math.max(15, row.location_interval_seconds || DEFAULT_INTERVAL_SEC));
      setTrackingEnabled(!!row.location_enabled);
    };

    (async () => {
      const { data } = await supabase
        .from("child_settings")
        .select("location_interval_seconds, location_enabled")
        .eq("child_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        apply(data);
      } else {
        // create defaults
        await supabase.from("child_settings").insert({
          child_id: user.id,
          location_interval_seconds: DEFAULT_INTERVAL_SEC,
          location_enabled: true,
        });
      }
    })();

    const ch = supabase
      .channel(`child-settings-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "child_settings", filter: `child_id=eq.${user.id}` },
        (payload) => apply(payload.new as any)
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  // Run periodic geolocation
  useEffect(() => {
    if (!enabled || !user?.id || !trackingEnabled) {
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
            { enableHighAccuracy: true, timeout: 15_000 }
          );
        });
      } catch {
        return null;
      }
    };

    const tick = async () => {
      const pos = await getPosition();
      if (!pos || cancelled) return;
      await supabase.from("child_locations").insert([
        {
          child_id: user.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        },
      ]);
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
  }, [enabled, user?.id, intervalSec, trackingEnabled]);
};
