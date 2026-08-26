import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGeoPosition,
  queryGeoPermission,
  startGeoWatch,
  stopGeoWatch,
  type GeoPermissionState,
} from "@/lib/geo-permission";
import {
  clearParentManualLocation,
  loadParentManualLocation,
  saveParentManualLocation,
} from "@/lib/parent-location-store";
import type { LatLng } from "@/lib/route-utils";

interface UseParentLocationOptions {
  refreshIntervalSec?: number;
  active?: boolean;
  routeActive?: boolean;
}

export const useParentLocation = ({
  refreshIntervalSec = 60,
  active = true,
  routeActive = false,
}: UseParentLocationOptions = {}) => {
  const { user } = useAuth();
  const [location, setLocation] = useState<LatLng | null>(null);
  const [manualLocation, setManualLocationState] = useState<LatLng | null>(null);
  const [permission, setPermission] = useState<GeoPermissionState>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [source, setSource] = useState<"gps" | "manual" | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setManualLocationState(null);
      return;
    }
    const stored = loadParentManualLocation(user.id);
    if (stored) {
      setManualLocationState({ lat: stored.lat, lng: stored.lng });
      setLocation({ lat: stored.lat, lng: stored.lng });
      setLastUpdatedAt(stored.savedAt);
      setSource(stored.source);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!active) return;
    try {
      startGeoWatch();
    } catch (e) {
      console.warn('Plugin error skipped:', e);
    }
    return () => {
      try {
        stopGeoWatch();
      } catch (e) {
        console.warn('Plugin error skipped:', e);
      }
    };
  }, [active]);

  const syncPermission = useCallback(async () => {
    try {
      const perm = await queryGeoPermission();
      setPermission(perm);
      return perm;
    } catch (e) {
      console.warn('Plugin error skipped:', e);
      return "prompt" as GeoPermissionState;
    }
  }, []);

  const setManualLocation = useCallback(
    (point: LatLng) => {
      if (!user?.id) return;
      try {
        saveParentManualLocation(user.id, point, "manual");
      } catch (e) {
        console.warn('Plugin error skipped:', e);
      }
      setManualLocationState(point);
      setLocation(point);
      setLastUpdatedAt(new Date().toISOString());
      setSource("manual");
      setError(null);
    },
    [user?.id],
  );

  const refresh = useCallback(async (): Promise<LatLng> => {
    setLoading(true);
    try {
      await syncPermission();
      const pos = await getGeoPosition(120_000, 45_000);
      const point = { lat: pos.latitude, lng: pos.longitude };
      if (user?.id) {
        try {
          saveParentManualLocation(user.id, point, "gps");
        } catch (e) {
          console.warn('Plugin error skipped:', e);
        }
      }
      setManualLocationState(null);
      setLocation(point);
      setLastUpdatedAt(new Date().toISOString());
      setSource("gps");
      setError(null);
      return point;
    } catch (e) {
      const stored = user?.id ? loadParentManualLocation(user.id) : null;
      if (stored) {
        const point = { lat: stored.lat, lng: stored.lng };
        setManualLocationState(point);
        setLocation(point);
        setLastUpdatedAt(stored.savedAt);
        setSource("manual");
        setError(null);
        return point;
      }
      const msg = e instanceof Error ? e.message : "Не удалось определить ваше место";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [syncPermission, user?.id]);

  useEffect(() => {
    if (!active) return;
    syncPermission();
  }, [active, syncPermission]);

  useEffect(() => {
    if (!active || !routeActive) return;

    const tick = () => {
      refresh().catch(() => {});
    };

    tick();
    const interval = window.setInterval(tick, refreshIntervalSec * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, routeActive, refresh, refreshIntervalSec]);

  const clear = useCallback(() => {
    if (user?.id) {
      try {
        clearParentManualLocation(user.id);
      } catch (e) {
        console.warn('Plugin error skipped:', e);
      }
    }
    setLocation(null);
    setManualLocationState(null);
    setError(null);
    setLastUpdatedAt(null);
    setSource(null);
  }, [user?.id]);

  return {
    location,
    manualLocation,
    effectiveLocation: location ?? manualLocation,
    permission,
    error,
    loading,
    lastUpdatedAt,
    source,
    refresh,
    setManualLocation,
    syncPermission,
    clear,
  };
};
