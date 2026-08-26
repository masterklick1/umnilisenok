import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLocationTracker, type LocationTrackerStatus } from "@/hooks/useLocationTracker";
import { useMonitoringListener } from "@/hooks/useMonitoringListener";
import { requestGeoPermissionInteractive, startGeoWatch, BACKGROUND_GEO_RESTART_EVENT } from "@/lib/geo-permission";
import { whenCapacitorReady } from "@/lib/native-ready";
import { isPushSupported, subscribeToPush } from "@/lib/push";
import {
  acquireWakeLock,
  isWakeLockSupported,
  loadKeepScreenOnPref,
  releaseWakeLock,
  saveKeepScreenOnPref,
  syncWakeLockWithPref,
} from "@/lib/wake-lock";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { registerPlugin, Capacitor } from "@capacitor/core";

const AppPlugin = registerPlugin<any>("App");

const openAppSettings = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppPlugin.openSettings?.();
    }
  } catch {
    /* noop */
  }
};

const defaultStatus: LocationTrackerStatus = {
  permission: "prompt",
  backgroundPermission: "unsupported",
  lastSentAt: null,
  lastError: null,
  intervalSec: 60,
  trackingEnabled: false,
  backgroundTrackingEnabled: false,
};

const formatInterval = (sec: number) => {
  if (sec < 60) return `${sec} сек`;
  const m = Math.round(sec / 60);
  return m < 60 ? `${m} мин` : `${Math.round(m / 60)} ч`;
};

function ChildLocationPanel() {
  const [status, setStatus] = useState<LocationTrackerStatus>(defaultStatus);
  const [retrying, setRetrying] = useState(false);
  const [stale, setStale] = useState(false);
  const [keepAwake, setKeepAwake] = useState(loadKeepScreenOnPref);

  useEffect(() => {
    const handler = (e: Event) => setStatus((e as CustomEvent<LocationTrackerStatus>).detail);
    window.addEventListener("location-tracker-status", handler);
    return () => window.removeEventListener("location-tracker-status", handler);
  }, []);

  useEffect(() => {
    if (!status.trackingEnabled || !status.lastSentAt) {
      setStale(status.trackingEnabled && !status.lastSentAt);
      return;
    }
    const check = () => {
      const age = Date.now() - new Date(status.lastSentAt!).getTime();
      setStale(age > status.intervalSec * 2.5 * 1000);
    };
    check();
    const t = window.setInterval(check, 10_000);
    return () => window.clearInterval(t);
  }, [status.trackingEnabled, status.lastSentAt, status.intervalSec]);

  useEffect(() => {
    saveKeepScreenOnPref(keepAwake);
    if (!keepAwake) {
      releaseWakeLock();
      return;
    }
    syncWakeLockWithPref();
    const onVis = () => syncWakeLockWithPref();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      releaseWakeLock();
    };
  }, [keepAwake]);

  const retry = async () => {
    setRetrying(true);
    try {
      await whenCapacitorReady();
      startGeoWatch();
      await requestGeoPermissionInteractive();
      if (keepAwake) await acquireWakeLock();
      window.dispatchEvent(new CustomEvent("force-location-send"));
      window.dispatchEvent(new CustomEvent(BACKGROUND_GEO_RESTART_EVENT));
    } catch (e) {
      console.error(e);
    } finally {
      setRetrying(false);
    }
  };

  if (!status.trackingEnabled) return null;

  const denied = status.permission === "denied";
  const ok = !!status.lastSentAt && !status.lastError && !stale && !denied;

  const icon = denied ? "⚠️" : ok ? "📍" : "⏳";
  const ringClass = denied
    ? "border-destructive/50 bg-destructive/10"
    : ok
      ? "border-green-300 bg-green-50/90"
      : "border-amber-300 bg-amber-50/90";

  return (
    <div className="fixed bottom-24 right-3 z-40">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Геолокация"
            className={`h-10 w-10 rounded-full border shadow-md backdrop-blur flex items-center justify-center text-base ${ringClass}`}
          >
            {icon}
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-64 p-3 space-y-2">
          {isWakeLockSupported() && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2 py-1.5">
              <Label htmlFor="keep-awake" className="text-xs cursor-pointer flex-1">
                Не гасить экран
              </Label>
              <Switch id="keep-awake" checked={keepAwake} onCheckedChange={setKeepAwake} />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {denied ? (
              <Button size="sm" onClick={openAppSettings}>
                Настройки
              </Button>
            ) : (
              <Button size="sm" disabled={retrying} onClick={retry}>
                {retrying ? "…" : "Отправить сейчас"}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Фоновые сервисы ребёнка: геолокация и ответы родителю — только на аккаунте ребёнка. */
export function ChildDeviceServices() {
  const { user, isDemo } = useAuth();
  const route = useLocation();
  const { isChild, loading: roleLoading } = useUserRole();

  const active =
    !!user?.id &&
    !isDemo &&
    isChild &&
    !roleLoading &&
    route.pathname !== "/auth" &&
    route.pathname !== "/join";

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const boot = async () => {
      try {
        await whenCapacitorReady();
        if (cancelled) return;
        startGeoWatch();
        const granted = await requestGeoPermissionInteractive();
        if (cancelled) return;
        if (granted) {
          window.dispatchEvent(new CustomEvent(BACKGROUND_GEO_RESTART_EVENT));
        }
        if (user?.id && isPushSupported() && Notification.permission === "granted") {
          subscribeToPush(user.id).catch(() => {});
        }
        if (loadKeepScreenOnPref()) syncWakeLockWithPref();
      } catch (e) {
        console.error(e);
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [active, user?.id]);

  useEffect(() => {
    if (!active) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        window.dispatchEvent(new CustomEvent("force-location-send"));
        if (loadKeepScreenOnPref()) syncWakeLockWithPref();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [active]);

  useLocationTracker(active);
  useMonitoringListener(active);

  if (!active) return null;

  return <ChildLocationPanel />;
}
