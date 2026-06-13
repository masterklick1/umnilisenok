const PREF_KEY = "child_keep_screen_on";

type WakeLockSentinel = { release: () => Promise<void> };

let sentinel: WakeLockSentinel | null = null;

export const isWakeLockSupported = (): boolean =>
  typeof navigator !== "undefined" && "wakeLock" in navigator;

export const loadKeepScreenOnPref = (): boolean =>
  localStorage.getItem(PREF_KEY) === "true";

export const saveKeepScreenOnPref = (on: boolean) => {
  localStorage.setItem(PREF_KEY, String(on));
};

export const isWakeLockActive = (): boolean => sentinel != null;

/** Prevent screen sleep while app is visible (browser/PWA). */
export const acquireWakeLock = async (): Promise<boolean> => {
  if (!isWakeLockSupported()) return false;
  try {
    if (sentinel) return true;
    sentinel = await (navigator as any).wakeLock.request("screen");
    sentinel?.addEventListener?.("release", () => {
      sentinel = null;
    });
    return true;
  } catch {
    sentinel = null;
    return false;
  }
};

export const releaseWakeLock = async () => {
  try {
    await sentinel?.release();
  } catch {
    /* ignore */
  }
  sentinel = null;
};

/** Re-request after tab becomes visible (browser releases wake lock when hidden). */
export const syncWakeLockWithPref = async (): Promise<boolean> => {
  if (!loadKeepScreenOnPref()) {
    await releaseWakeLock();
    return false;
  }
  if (document.visibilityState !== "visible") return false;
  return acquireWakeLock();
};
