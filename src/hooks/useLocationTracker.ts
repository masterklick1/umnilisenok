import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

const INTERVAL_MS = 60_000; // 1 min

/**
 * Periodically writes child's geo-position to DB so parents can see it on a map.
 * Works in both Capacitor (native GPS) and web (browser Geolocation API).
 */
export const useLocationTracker = (enabled = true) => {
  const { user } = useAuth();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !user?.id) return;

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
      timerRef.current = window.setInterval(tick, INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [enabled, user?.id]);
};
