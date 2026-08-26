import { Geolocation } from "@capacitor/geolocation";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativePluginAvailable, whenCapacitorReady } from "@/lib/native-ready";

/** Must match the channel id created by the community background-geolocation plugin. */
export const BG_GEO_NOTIFICATION_CHANNEL_ID = "com.equimaps.capacitor_background_geolocation";
export const BG_GEO_NOTIFICATION_TITLE = "Геолокация активна";
export const BG_GEO_NOTIFICATION_TEXT = "Умный Лисёнок защищает ребёнка";
export const BG_GEO_NOTIFICATION_CHANNEL_NAME = "Геолокация активна";

export type GeoPermissionState = "granted" | "denied" | "prompt" | "unsupported" | "not-determined";
export type BackgroundGeoPermissionState = "always" | "denied" | "prompt" | "unsupported" | "not-determined";

let cachedPosition: (GeoPositionResult & { cachedAt: number }) | null = null;
let webWatchId: number | null = null;
let nativeWatchId: string | null = null;
let watchRefCount = 0;
let backgroundGeoPlugin: any | null | undefined;

const getBackgroundGeolocation = (): any | null => {
  if (backgroundGeoPlugin !== undefined) return backgroundGeoPlugin;
  try {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("BackgroundGeolocation")) {
      backgroundGeoPlugin = null;
      return null;
    }
    backgroundGeoPlugin = registerPlugin<any>("BackgroundGeolocation");
    return backgroundGeoPlugin;
  } catch (e) {
    console.warn('Plugin error skipped:', e);
    backgroundGeoPlugin = null;
    return null;
  }
};

export const queryGeoPermission = async (): Promise<GeoPermissionState> => {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        await whenCapacitorReady();
        if (!Capacitor.isPluginAvailable("Geolocation")) return "prompt";
        const perm = await Geolocation.checkPermissions();
        if (perm.location === "granted") return "granted";
        if (perm.location === "denied") return "denied";
        return "prompt";
      } catch (e) {
        console.warn('Plugin error skipped:', e);
        return "prompt";
      }
    }

    if (!("geolocation" in navigator)) return "unsupported";

    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (status.state === "granted") return "granted";
      if (status.state === "denied") return "denied";
      return "prompt";
    } catch (e) {
      console.warn('Plugin error skipped:', e);
      return "prompt";
    }
  } catch (e) {
    console.warn('Plugin error skipped:', e);
    return "prompt";
  }
};

export interface GeoPositionResult {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

const mapWebError = (err: GeolocationPositionError): Error => {
  if (err.code === err.PERMISSION_DENIED) {
    return new Error("Разрешите геопозицию в настройках браузера");
  }
  if (err.code === err.TIMEOUT) {
    return new Error("GPS не ответил вовремя — держите приложение открытым на экране");
  }
  return new Error("Не удалось получить координаты");
};

const cacheResult = (pos: GeoPositionResult) => {
  cachedPosition = { ...pos, cachedAt: Date.now() };
};

export const getCachedGeoPosition = (maxAgeMs = 600_000): GeoPositionResult | null => {
  if (!cachedPosition) return null;
  if (Date.now() - cachedPosition.cachedAt > maxAgeMs) return null;
  const { latitude, longitude, accuracy } = cachedPosition;
  return { latitude, longitude, accuracy };
};

const webGetPosition = (
  enableHighAccuracy: boolean,
  timeoutMs: number,
  maximumAgeMs: number,
): Promise<GeoPositionResult> =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const result = {
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy ?? null,
        };
        cacheResult(result);
        resolve(result);
      },
      (err) => reject(mapWebError(err)),
      { enableHighAccuracy, timeout: timeoutMs, maximumAge: maximumAgeMs },
    );
  });

/** Keep GPS warm while app is open. Never throws — safe to call from effects. */
export const startGeoWatch = () => {
  watchRefCount += 1;
  if (watchRefCount > 1) return;
  void startGeoWatchInternal();
};

const startGeoWatchInternal = async () => {
  try {
    await whenCapacitorReady();

    if (Capacitor.isNativePlatform()) {
      if (nativeWatchId) return;
      try {
        if (!Capacitor.isPluginAvailable("Geolocation")) return;
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 60_000, maximumAge: 60_000 },
          (pos) => {
            if (!pos) return;
            cacheResult({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
            });
          },
        );
        nativeWatchId = id;
      } catch (e) {
        console.warn('Plugin error skipped:', e);
      }
      return;
    }

    if (webWatchId != null || !("geolocation" in navigator)) return;

    webWatchId = navigator.geolocation.watchPosition(
      (p) => {
        cacheResult({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy ?? null,
        });
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 60_000 },
    );
  } catch (e) {
    console.warn('Plugin error skipped:', e);
    watchRefCount = Math.max(0, watchRefCount - 1);
  }
};

export const stopGeoWatch = () => {
  watchRefCount = Math.max(0, watchRefCount - 1);
  if (watchRefCount > 0) return;

  if (nativeWatchId) {
    try {
      Geolocation.clearWatch({ id: nativeWatchId }).catch((e) => {
        console.warn('Plugin error skipped:', e);
      });
    } catch (e) {
      console.warn('Plugin error skipped:', e);
    }
    nativeWatchId = null;
  }
  if (webWatchId == null) return;
  try {
    navigator.geolocation.clearWatch(webWatchId);
  } catch (e) {
    console.warn('Plugin error skipped:', e);
  }
  webWatchId = null;
};

export const getGeoPosition = async (
  maximumAgeMs = 60_000,
  timeoutMs = 45_000,
  allowCached = true,
): Promise<GeoPositionResult> => {
  if (allowCached) {
    const cached = getCachedGeoPosition(Math.max(maximumAgeMs, 300_000));
    if (cached) return cached;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      await whenCapacitorReady();
      if (!Capacitor.isPluginAvailable("Geolocation")) {
        throw new Error("Плагин геолокации недоступен");
      }
      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== "granted") {
          const req = await Geolocation.requestPermissions();
          if (req.location !== "granted") {
            throw new Error("Нет разрешения на геопозицию");
          }
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: timeoutMs,
        });
        const result = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        };
        cacheResult(result);
        return result;
      } catch (e) {
        console.warn('Plugin error skipped:', e);
        throw e;
      }
    }
  } catch (e) {
    console.warn('Plugin error skipped:', e);
    throw e;
  }

  if (!("geolocation" in navigator)) {
    throw new Error("Геолокация не поддерживается");
  }

  try {
    return await webGetPosition(true, Math.min(timeoutMs, 25_000), maximumAgeMs);
  } catch (highAccErr) {
    try {
      return await webGetPosition(false, timeoutMs, Math.max(maximumAgeMs, 300_000));
    } catch (e) {
      console.warn('Plugin error skipped:', e);
      const stale = getCachedGeoPosition(900_000);
      if (stale) return stale;
      throw highAccErr;
    }
  }
};

export const requestGeoPermissionInteractive = async (): Promise<boolean> => {
  try {
    startGeoWatch();
    await getGeoPosition(0, 45_000, false);
    return true;
  } catch (e) {
    console.warn('Plugin error skipped:', e);
    return getCachedGeoPosition() !== null;
  }
};

const mapBackgroundLocationState = (location?: string): BackgroundGeoPermissionState => {
  if (location === "granted" || location === "always") return "always";
  if (location === "denied") return "denied";
  return "prompt";
};

export const queryBackgroundGeoPermission = async (): Promise<BackgroundGeoPermissionState> => {
  try {
    if (!Capacitor.isNativePlatform()) {
      return "unsupported";
    }
    await whenCapacitorReady();
    if (!Capacitor.isPluginAvailable("BackgroundGeolocation")) return "prompt";
    const plugin = getBackgroundGeolocation();
    if (!plugin) return "prompt";
    try {
      const perm = await plugin.checkPermissions();
      return mapBackgroundLocationState(perm?.location);
    } catch (e) {
      console.warn('Plugin error skipped:', e);
      return "prompt";
    }
  } catch (e) {
    console.warn('Plugin error skipped:', e);
    return "prompt";
  }
};

export const ensureLocationNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      return false;
    }
    await whenCapacitorReady();
    if (!isNativePluginAvailable("LocalNotifications")) return false;

    let status;
    try {
      status = await LocalNotifications.checkPermissions();
      if (status.display !== "granted") {
        status = await LocalNotifications.requestPermissions();
      }
    } catch (e) {
      console.warn('Plugin error skipped:', e);
      return false;
    }

    try {
      await LocalNotifications.createChannel({
        id: BG_GEO_NOTIFICATION_CHANNEL_ID,
        name: BG_GEO_NOTIFICATION_CHANNEL_NAME,
        description: BG_GEO_NOTIFICATION_TEXT,
        importance: 3,
        visibility: 1,
        vibration: false,
        lights: false,
      });
    } catch (e) {
      console.warn('Plugin error skipped:', e);
    }

    return status.display === "granted";
  } catch (e) {
    console.warn('Plugin error skipped:', e);
    return false;
  }
};

export const BACKGROUND_GEO_RESTART_EVENT = "restart-background-geo";

export const requestBackgroundGeoPermission = async (): Promise<BackgroundGeoPermissionState> => {
  try {
    if (!Capacitor.isNativePlatform()) {
      return "unsupported";
    }
    await whenCapacitorReady();
    await ensureLocationNotificationPermission();
    if (!Capacitor.isPluginAvailable("BackgroundGeolocation")) {
      return "prompt";
    }
    const plugin = getBackgroundGeolocation();
    if (!plugin) return "prompt";
    try {
      const perm = await plugin.requestPermissions({
        permissions: ["location"],
      });
      const state = mapBackgroundLocationState(perm?.location);
      if (state === "always" && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(BACKGROUND_GEO_RESTART_EVENT));
      }
      return state;
    } catch (e) {
      console.warn('Plugin error skipped:', e);
      return "denied";
    }
  } catch (e) {
    console.warn('Plugin error skipped:', e);
    return "denied";
  }
};

export const isBackgroundGeoSupported = (): boolean => {
  try {
    return (
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === "android" &&
      Capacitor.isPluginAvailable("BackgroundGeolocation")
    );
  } catch (e) {
    console.warn('Plugin error skipped:', e);
    return false;
  }
};

export { getBackgroundGeolocation };
