import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLocationTracker, type LocationTrackerStatus } from "@/hooks/useLocationTracker";
import { useMonitoringListener } from "@/hooks/useMonitoringListener";
import { requestGeoPermissionInteractive, startGeoWatch } from "@/lib/geo-permission";
import { Button } from "@/components/ui/button";

const defaultStatus: LocationTrackerStatus = {
  permission: "prompt",
  lastSentAt: null,
  lastError: null,
  intervalSec: 60,
  trackingEnabled: false,
};

const formatInterval = (sec: number) => {
  if (sec < 60) return `${sec} сек`;
  const m = Math.round(sec / 60);
  return m < 60 ? `${m} мин` : `${Math.round(m / 60)} ч`;
};

function LocationStatusBanner() {
  const [status, setStatus] = useState<LocationTrackerStatus>(defaultStatus);
  const [retrying, setRetrying] = useState(false);
  const [stale, setStale] = useState(false);

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

  const showProblem =
    status.trackingEnabled &&
    (status.permission === "denied" ||
      !!status.lastError ||
      stale ||
      (!status.lastSentAt && status.permission !== "denied"));

  const showOkHint =
    status.trackingEnabled && status.lastSentAt && !status.lastError && !stale;

  if (!showProblem && !showOkHint) return null;

  const retry = async () => {
    setRetrying(true);
    startGeoWatch();
    await requestGeoPermissionInteractive();
    window.dispatchEvent(new CustomEvent("force-location-send"));
    setRetrying(false);
  };

  if (showOkHint) {
    return (
      <div className="fixed bottom-20 left-3 right-3 z-40 max-w-md mx-auto pointer-events-none">
        <div className="rounded-xl border border-green-200 bg-green-50/95 shadow p-2 text-xs text-center text-muted-foreground">
          📍 Отправлено · родители видят · каждые {formatInterval(status.intervalSec)}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-3 right-3 z-40 max-w-md mx-auto">
      <div className="rounded-xl border border-amber-300 bg-amber-50 shadow-lg p-3 text-sm space-y-2">
        {status.permission === "denied" ? (
          <p>📍 Геопозиция выключена. Родители не видят, где ты. Включи в настройках браузера.</p>
        ) : status.lastError ? (
          <p>📍 {status.lastError}</p>
        ) : stale ? (
          <p>📍 Долго нет отправки — держи приложение открытым на экране</p>
        ) : (
          <p>📍 Ждём первую отправку координат родителям…</p>
        )}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Интервал {formatInterval(status.intervalSec)}
            {status.lastSentAt ? " · была отправка" : " · ещё не отправляли"}
          </span>
          <Button size="sm" disabled={retrying} onClick={retry}>
            {retrying ? "…" : "Отправить сейчас"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Фоновые сервисы ребёнка: геолокация и ответы родителю — только на аккаунте ребёнка. */
export function ChildDeviceServices() {
  const { user } = useAuth();
  const route = useLocation();
  const { isChild, loading: roleLoading } = useUserRole();

  const active =
    !!user?.id &&
    isChild &&
    !roleLoading &&
    route.pathname !== "/auth" &&
    route.pathname !== "/join";

  useEffect(() => {
    if (!active) return;
    startGeoWatch();
    requestGeoPermissionInteractive().catch(() => {});
  }, [active]);

  useLocationTracker(active);
  useMonitoringListener(active);

  if (!active) return null;

  return <LocationStatusBanner />;
}
