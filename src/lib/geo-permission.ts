import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

export type GeoPermissionState = "granted" | "denied" | "prompt" | "unsupported" | "not-determined";
export type BackgroundGeoPermissionState = "always" | "denied" | "prompt" | "unsupported" | "not-determined";

let cachedPosition: (GeoPositionResult & { cachedAt: number }) | null = null;
let webWatchId: number | null = null;
let nativeWatchId: string | null = null;
let watchRefCount = 0;

// Динамический импорт BackgroundGeolocation (только на нативной платформе)
let BackgroundGeoLocationModule: any = null;

const getBackgroundGeolocation = async () => {
  if (!Capacitor.isNativePlatform()) return null;
  if (BackgroundGeoLocationModule !== undefined) return BackgroundGeoLocationModule;
  
  try {
    const module = await import("@capacitor-community/background-geolocation");
    BackgroundGeoLocationModule = module.BackgroundGeolocation;
    return BackgroundGeoLocationModule;
  } catch {
    BackgroundGeoLocationModule = null;
    return null;
  }
};

export const queryGeoPermission = async (): Promise<GeoPermissionState> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location === "granted") return "granted";
      if (perm.location === "denied") return "denied";
      return "prompt";
    } catch {
      return "prompt";
    }
  }

  if (!("geolocation" in navigator)) return "unsupported";

  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    return "prompt";
  } catch {
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

/** Keep GPS warm while app is open. */
export const startGeoWatch = () => {
  watchRefCount += 1;
  if (watchRefCount > 1) return;

  if (Capacitor.isNativePlatform()) {
    if (nativeWatchId) return;
    Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 60_000, maximumAge: 60_000 },
      (pos) => {
        if (!pos) return;
        cacheResult({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        });
      },
    ).then((id) => {
      nativeWatchId = id;
    });
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
};

export const stopGeoWatch = () => {
  watchRefCount = Math.max(0, watchRefCount - 1);
  if (watchRefCount > 0) return;

  if (nativeWatchId) {
    Geolocation.clearWatch({ id: nativeWatchId }).catch(() => {});
    nativeWatchId = null;
  }
  if (webWatchId == null) return;
  navigator.geolocation.clearWatch(webWatchId);
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

  if (Capacitor.isNativePlatform()) {
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
  }

  if (!("geolocation" in navigator)) {
    throw new Error("Геолокация не поддерживается");
  }

  try {
    return await webGetPosition(true, Math.min(timeoutMs, 25_000), maximumAgeMs);
  } catch (highAccErr) {
    try {
      return await webGetPosition(false, timeoutMs, Math.max(maximumAgeMs, 300_000));
    } catch {
      const stale = getCachedGeoPosition(900_000);
      if (stale) return stale;
      throw highAccErr;
    }
  }
};

export const requestGeoPermissionInteractive = async (): Promise<boolean> => {
  startGeoWatch();
  try {
    await getGeoPosition(0, 45_000, false);
    return true;
  } catch {
    return getCachedGeoPosition() !== null;
  }
};

export const queryBackgroundGeoPermission = async (): Promise<BackgroundGeoPermissionState> => {
  if (!Capacitor.isNativePlatform()) {
    return "unsupported";
  }

  try {
    const BgGeo = await getBackgroundGeolocation();
    if (!BgGeo) return "unsupported";
    
    const perm = await BgGeo.checkPermissions();
    if (perm.location === "always") return "always";
    if (perm.location === "denied") return "denied";
    return "prompt";
  } catch {
    return "prompt";
  }
};

export const requestBackgroundGeoPermission = async (): Promise<BackgroundGeoPermissionState> => {
  if (!Capacitor.isNativePlatform()) {
    return "unsupported";
  }

  try {
    const BgGeo = await getBackgroundGeolocation();
    if (!BgGeo) return "unsupported";
    
    const perm = await BgGeo.requestPermissions({
      permissions: ["location"],
      rationale: {
        title: "📍 Доступ к геопозиции в фоне",
        message: "Приложению нужен доступ к вашей геопозиции, даже когда оно закрыто, чтобы отслеживать местоположение ребёнка.",
        buttonNegative: "Отменить",
        buttonPositive: "Разрешить",
      },
    });
    
    if (perm.location === "always") return "always";
    if (perm.location === "denied") return "denied";
    return "prompt";
  } catch {
    return "denied";
  }
};

export const isBackgroundGeoSupported = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
};
