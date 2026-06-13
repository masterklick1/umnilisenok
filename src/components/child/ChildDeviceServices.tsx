import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationTracker, type LocationTrackerStatus } from "@/hooks/useLocationTracker";
import { useMonitoringListener } from "@/hooks/useMonitoringListener";
import { requestGeoPermissionInteractive } from "@/lib/geo-permission";
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

  useEffect(() => {
    const handler = (e: Event) => setStatus((e as CustomEvent<LocationTrackerStatus>).detail);
    window.addEventListener("location-tracker-status", handler);
    return () => window.removeEventListener("location-tracker-status", handler);
  }, []);

  const showBanner =
    status.trackingEnabled &&
    (status.permission === "denied" ||
      status.permission === "prompt" ||
      !!status.lastError);

  if (!showBanner) return null;

  const retry = async () => {
    setRetrying(true);
    await requestGeoPermissionInteractive();
    setRetrying(false);
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 z-40 max-w-md mx-auto">
      <div className="rounded-xl border border-amber-300 bg-amber-50 shadow-lg p-3 text-sm space-y-2">
        {status.permission === "denied" ? (
          <p>📍 Геопозиция выключена. Родители не видят, где ты. Включи в настройках браузера.</p>
        ) : status.lastError ? (
          <p>📍 {status.lastError}</p>
        ) : (
          <p>📍 Разреши геопозицию — родители смогут видеть, что ты в безопасности</p>
        )}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Отправка каждые {formatInterval(status.intervalSec)}
            {status.lastSentAt ? " · OK" : ""}
          </span>
          <Button size="sm" disabled={retrying} onClick={retry}>
            {retrying ? "…" : "Разрешить снова"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Фоновые сервисы ребёнка: геолокация и ответы родителю — на всех страницах. */
export function ChildDeviceServices() {
  const { user } = useAuth();
  const route = useLocation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!user?.id || route.pathname === "/parent" || route.pathname === "/auth") {
      setActive(false);
      return;
    }

    const activeChildId = sessionStorage.getItem("activeChildId");
    if (activeChildId) {
      setActive(true);
      return;
    }

    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setActive(data?.role === "child"));
  }, [user?.id, route.pathname]);

  useLocationTracker(active);
  useMonitoringListener();

  if (!active) return null;

  return <LocationStatusBanner />;
}
