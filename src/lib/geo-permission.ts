import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

export type GeoPermissionState = "granted" | "denied" | "prompt" | "unsupported";

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

const webGetPosition = (
  enableHighAccuracy: boolean,
  timeoutMs: number,
  maximumAgeMs: number,
): Promise<GeoPositionResult> =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy ?? null,
        }),
      (err) => reject(mapWebError(err)),
      { enableHighAccuracy, timeout: timeoutMs, maximumAge: maximumAgeMs },
    );
  });

export const getGeoPosition = async (
  maximumAgeMs = 60_000,
  timeoutMs = 30_000,
): Promise<GeoPositionResult> => {
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
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
    };
  }

  if (!("geolocation" in navigator)) {
    throw new Error("Геолокация не поддерживается");
  }

  try {
    return await webGetPosition(true, Math.min(timeoutMs, 20_000), maximumAgeMs);
  } catch (highAccErr) {
    try {
      return await webGetPosition(false, timeoutMs, Math.max(maximumAgeMs, 120_000));
    } catch {
      throw highAccErr;
    }
  }
};

export const requestGeoPermissionInteractive = async (): Promise<boolean> => {
  try {
    await getGeoPosition(0, 25_000);
    return true;
  } catch {
    return false;
  }
};
