import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLocationTracker, type LocationTrackerStatus } from "@/hooks/useLocationTracker";
import { useMonitoringListener } from "@/hooks/useMonitoringListener";
import { requestGeoPermissionInteractive, startGeoWatch } from "@/lib/geo-permission";
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
  const { user } = useAuth();
  const [status, setStatus] = useState<LocationTrackerStatus>(defaultStatus);
  const [retrying, setRetrying] = useState(false);
  const [stale, setStale] = useState(false);
  const [keepAwake, setKeepAwake] = useState(loadKeepScreenOnPref);
  const [pushEnabling, setPushEnabling] = useState(false);
  const [expanded, setExpanded] = useState(true);

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
    startGeoWatch();
    await requestGeoPermissionInteractive();
    if (keepAwake) await acquireWakeLock();
    window.dispatchEvent(new CustomEvent("force-location-send"));
    setRetrying(false);
  };

  const enablePush = async () => {
    if (!user?.id) return;
    setPushEnabling(true);
    await subscribeToPush(user.id);
    setPushEnabling(false);
  };

  const showOk =
    status.trackingEnabled && status.lastSentAt && !status.lastError && !stale;

  useEffect(() => {
    if (showOk) setExpanded(false);
  }, [showOk]);

  if (!status.trackingEnabled) return null;

  if (showOk && !expanded) {
    return (
      <div className="fixed bottom-24 left-3 right-3 z-40 max-w-md mx-auto">
        <button
          type="button"
          className="w-full rounded-xl border border-green-200 bg-green-50/95 shadow px-3 py-2 text-xs text-center text-muted-foreground"
          onClick={() => setExpanded(true)}
        >
          📍 OK · каждые {formatInterval(status.intervalSec)} · нажми для настроек
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-3 right-3 z-40 max-w-md mx-auto">
      <div className="rounded-xl border border-amber-300/80 bg-card/95 backdrop-blur shadow-lg p-3 text-sm space-y-2">
        <p className="font-medium text-sm">📍 Родители видят, где ты</p>
        <p className="text-xs text-muted-foreground">
          Телефон в «спячке» (экран погашен) — GPS не работает. Держи приложение открытым или
          включи «Не гасить экран».
        </p>

        {isWakeLockSupported() && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2 py-1.5">
            <Label htmlFor="keep-awake" className="text-xs cursor-pointer flex-1">
              Не гасить экран
            </Label>
            <Switch id="keep-awake" checked={keepAwake} onCheckedChange={setKeepAwake} />
          </div>
        )}

        {showOk ? (
          <p className="text-xs text-green-700">✓ Отправлено · каждые {formatInterval(status.intervalSec)}</p>
        ) : status.permission === "denied" ? (
          <p className="text-xs text-destructive">Включи геопозицию в настройках браузера</p>
        ) : status.lastError ? (
          <p className="text-xs text-amber-900">{status.lastError}</p>
        ) : stale ? (
          <p className="text-xs text-amber-900">Долго нет отправки — открой приложение снова</p>
        ) : (
          <p className="text-xs text-muted-foreground">Ждём первую отправку…</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={retrying} onClick={retry}>
            {retrying ? "…" : "Отправить сейчас"}
          </Button>
          {isPushSupported() && Notification.permission !== "granted" && (
            <Button size="sm" variant="outline" disabled={pushEnabling} onClick={enablePush}>
              {pushEnabling ? "…" : "Уведомления"}
            </Button>
          )}
          {showOk && (
            <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
              Свернуть
            </Button>
          )}
        </div>
      </div>
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
    startGeoWatch();
    requestGeoPermissionInteractive().catch(() => {});
    if (user?.id && isPushSupported() && Notification.permission === "granted") {
      subscribeToPush(user.id).catch(() => {});
    }
    if (loadKeepScreenOnPref()) syncWakeLockWithPref();
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
