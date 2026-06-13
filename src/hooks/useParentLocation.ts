import { useCallback, useEffect, useState } from "react";
import {
  getGeoPosition,
  queryGeoPermission,
  type GeoPermissionState,
} from "@/lib/geo-permission";
import type { LatLng } from "@/lib/route-utils";

interface UseParentLocationOptions {
  refreshIntervalSec?: number;
  active?: boolean;
  /** Периодически обновлять, пока показан маршрут до ребёнка */
  routeActive?: boolean;
}

export const useParentLocation = ({
  refreshIntervalSec = 60,
  active = true,
  routeActive = false,
}: UseParentLocationOptions = {}) => {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [permission, setPermission] = useState<GeoPermissionState>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const syncPermission = useCallback(async () => {
    const perm = await queryGeoPermission();
    setPermission(perm);
    return perm;
  }, []);

  const refresh = useCallback(async (): Promise<LatLng> => {
    setLoading(true);
    try {
      await syncPermission();
      const pos = await getGeoPosition(90_000, 30_000);
      const point = { lat: pos.latitude, lng: pos.longitude };
      setLocation(point);
      setLastUpdatedAt(new Date().toISOString());
      setError(null);
      return point;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось определить ваше место";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [syncPermission]);

  useEffect(() => {
    if (!active) return;
    syncPermission();
  }, [active, syncPermission]);

  useEffect(() => {
    if (!active || !routeActive) return;

    const tick = () => {
      if (document.visibilityState === "hidden") return;
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
    setLocation(null);
    setError(null);
    setLastUpdatedAt(null);
  }, []);

  return {
    location,
    permission,
    error,
    loading,
    lastUpdatedAt,
    refresh,
    syncPermission,
    clear,
  };
};
