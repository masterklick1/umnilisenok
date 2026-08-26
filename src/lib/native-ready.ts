import { Capacitor } from "@capacitor/core";

/**
 * Wait until the Capacitor / Cordova bridge is safe to call.
 * useLegacyBridge: true (needed by background-geolocation) still emits Cordova's
 * `deviceready`. Calling location / notification plugins before that can crash
 * the Android process on startup.
 */
let readyPromise: Promise<void> | null = null;

export const whenCapacitorReady = (): Promise<void> => {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<void>((resolve) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve();
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      // Let native plugin load() finish and the first React frame paint.
      window.setTimeout(resolve, 50);
    };

    const waitForDom = (next: () => void) => {
      if (document.readyState === "complete" || document.readyState === "interactive") {
        next();
      } else {
        document.addEventListener("DOMContentLoaded", next, { once: true });
        window.addEventListener("load", next, { once: true });
      }
    };

    waitForDom(() => {
      const cordova = (window as Window & { cordova?: unknown }).cordova;
      if (cordova) {
        document.addEventListener("deviceready", finish, { once: true });
        window.setTimeout(finish, 2500);
        return;
      }
      finish();
    });
  });

  return readyPromise;
};

export const isNativePluginAvailable = (name: string): boolean => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable(name);
  } catch {
    return false;
  }
};
