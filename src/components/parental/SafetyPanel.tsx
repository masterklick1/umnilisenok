import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, AlertOctagon, Camera, Mic, Navigation, CheckCircle, Loader2, Timer, Shield, ShieldAlert, Crosshair, BookmarkPlus, Trash2, Route, Car, Footprints, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { LocationMap } from "@/components/LocationMap";
import {
  formatPlaceLabel,
  loadGeofenceLabel,
  loadSavedPlaces,
  persistGeofenceLabel,
  removeSavedPlace,
  upsertSavedPlace,
  type GeofencePreset,
  type SavedPlace,
} from "@/lib/saved-places";
import { PlaceAddressSearch, type SelectedPlacePayload } from "@/components/parental/PlaceAddressSearch";
import {
  distanceMeters,
  formatDistance,
  getParentLocation,
  googleMapsDirectionsUrl,
  type LatLng,
  type TravelMode,
} from "@/lib/route-utils";
import { useParentLocation } from "@/hooks/useParentLocation";
import { requestGeoPermissionInteractive } from "@/lib/geo-permission";

interface Props {
  childId: string;
  childName: string;
}

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  created_at: string;
}

interface SosAlert {
  id: string;
  latitude: number | null;
  longitude: number | null;
  message: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

interface MonitoringReq {
  id: string;
  request_type: string;
  status: string;
  result_path: string | null;
  created_at: string;
}

const formatInterval = (sec: number) => {
  if (sec < 60) return `${sec} сек`;
  const m = Math.round(sec / 60);
  return m < 60 ? `${m} мин` : `${Math.round(m / 60)} ч`;
};

interface Settings {
  location_enabled: boolean;
  location_interval_seconds: number;
  geofence_enabled: boolean;
  geofence_lat: number | null;
  geofence_lng: number | null;
  geofence_radius_m: number;
}

interface GeofenceEvent {
  id: string;
  event_type: string;
  latitude: number;
  longitude: number;
  distance_m: number | null;
  created_at: string;
}

const DEFAULT_SETTINGS: Settings = {
  location_enabled: true,
  location_interval_seconds: 60,
  geofence_enabled: false,
  geofence_lat: null,
  geofence_lng: null,
  geofence_radius_m: 300,
};

export const SafetyPanel = ({ childId, childName }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useState<Location | null>(null);
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [requests, setRequests] = useState<MonitoringReq[]>([]);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [geoEvents, setGeoEvents] = useState<GeofenceEvent[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [activeZoneLabel, setActiveZoneLabel] = useState<string | null>(null);
  const [customPlaceName, setCustomPlaceName] = useState("");
  const [movementPath, setMovementPath] = useState<LatLng[]>([]);
  const [showRoute, setShowRoute] = useState(false);
  const [routeMode, setRouteMode] = useState<TravelMode>("driving");
  const [showTrail, setShowTrail] = useState(true);

  const {
    location: parentLocation,
    permission: parentPermission,
    error: parentGeoError,
    loading: loadingParentGeo,
    lastUpdatedAt: parentLocUpdatedAt,
    refresh: refreshParentLocation,
    clear: clearParentLocation,
  } = useParentLocation({ active: true, routeActive: showRoute, refreshIntervalSec: 60 });

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("child_settings")
      .select("location_enabled, location_interval_seconds, geofence_enabled, geofence_lat, geofence_lng, geofence_radius_m")
      .eq("child_id", childId)
      .maybeSingle();
    setSettings({ ...DEFAULT_SETTINGS, ...((data as any) ?? {}) });
  }, [childId]);

  const saveSettings = async (patch: Partial<Settings>) => {
    if (!user) return;
    setSavingSettings(true);
    const next = { ...(settings ?? DEFAULT_SETTINGS), ...patch };
    setSettings(next);
    const { error } = await supabase
      .from("child_settings")
      .upsert(
        {
          child_id: childId,
          location_enabled: next.location_enabled,
          location_interval_seconds: next.location_interval_seconds,
          geofence_enabled: next.geofence_enabled,
          geofence_lat: next.geofence_lat,
          geofence_lng: next.geofence_lng,
          geofence_radius_m: next.geofence_radius_m,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "child_id" }
      );
    setSavingSettings(false);
    if (error) toast({ title: "Не удалось сохранить", description: error.message, variant: "destructive" });
  };


  const loadData = useCallback(async () => {
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const [loc, history, sos, req, geo] = await Promise.all([
      supabase
        .from("child_locations")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("child_locations")
        .select("latitude, longitude, created_at")
        .eq("child_id", childId)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(150),
      supabase
        .from("sos_alerts")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("monitoring_requests")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("geofence_events" as any)
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (loc.data) setLocation(loc.data as Location);
    if (history.data) {
      setMovementPath(
        (history.data as { latitude: number; longitude: number }[]).map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
        })),
      );
    }
    if (sos.data) setAlerts(sos.data as SosAlert[]);
    if (req.data) setRequests(req.data as MonitoringReq[]);
    if (geo.data) setGeoEvents(geo.data as unknown as GeofenceEvent[]);
  }, [childId]);

  useEffect(() => {
    loadData();
    loadSettings();

    const poll = window.setInterval(loadData, 5000);

    const channel = supabase
      .channel(`safety-${childId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_alerts", filter: `child_id=eq.${childId}` },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "child_locations", filter: `child_id=eq.${childId}` },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "monitoring_requests", filter: `child_id=eq.${childId}` },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "geofence_events", filter: `child_id=eq.${childId}` },
        (payload) => {
          const ev = payload.new as any as GeofenceEvent;
          loadData();
          toast({
            title: ev.event_type === "exit" ? "⚠️ Ребёнок вышел из зоны" : "✅ Ребёнок вернулся в зону",
            description: `${childName} · ${ev.distance_m ? Math.round(ev.distance_m) + "м от центра" : ""}`,
            variant: ev.event_type === "exit" ? "destructive" : "default",
            duration: 30000,
          });
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [childId, childName, loadData, loadSettings, toast]);

  const isLocationFresh =
    location &&
    Date.now() - new Date(location.created_at).getTime() <
      (settings?.location_interval_seconds ?? 60) * 2 * 1000;

  useEffect(() => {
    setSavedPlaces(loadSavedPlaces(childId));
    setActiveZoneLabel(loadGeofenceLabel(childId));
  }, [childId]);

  const activateGeofence = async (
    lat: number,
    lng: number,
    radius_m: number,
    label: string,
    saveAsPlace?: SavedPlace,
  ) => {
    await saveSettings({
      geofence_lat: lat,
      geofence_lng: lng,
      geofence_radius_m: radius_m,
      geofence_enabled: true,
    });
    persistGeofenceLabel(childId, label);
    setActiveZoneLabel(label);
    if (saveAsPlace) {
      setSavedPlaces(upsertSavedPlace(childId, saveAsPlace));
    }
  };

  const applyAtCurrentLocation = (preset: GeofencePreset, alsoSave: boolean) => {
    if (!location) {
      toast({
        title: "Нет координат",
        description: `Когда ${childName} будет в нужном месте — откройте приложение на его телефоне и нажмите снова.`,
        variant: "destructive",
      });
      return;
    }
    const label = formatPlaceLabel(preset.emoji, preset.name);
    const place: SavedPlace = {
      id: preset.id,
      name: preset.name,
      emoji: preset.emoji,
      lat: location.latitude,
      lng: location.longitude,
      radius_m: preset.radius_m,
    };
    activateGeofence(
      location.latitude,
      location.longitude,
      preset.radius_m,
      label,
      alsoSave ? place : undefined,
    );
    toast({
      title: `Зона «${preset.name}» включена`,
      description: `${preset.hint}. Уведомим, если ${childName} выйдет из зоны.${alsoSave ? " Место сохранено." : ""}`,
    });
  };

  const applySavedPlace = (place: SavedPlace) => {
    const label = formatPlaceLabel(place.emoji, place.name);
    activateGeofence(place.lat, place.lng, place.radius_m, label);
    toast({
      title: `Зона «${place.name}» включена`,
      description: `Следим за сохранённым местом (радиус ${place.radius_m} м).`,
    });
  };

  const saveCustomPlace = () => {
    if (!location) {
      toast({
        title: "Нет координат",
        description: "Дождитесь геопозиции с телефона ребёнка.",
        variant: "destructive",
      });
      return;
    }
    const name = customPlaceName.trim() || "Моё место";
    const id = `custom-${Date.now()}`;
    const place: SavedPlace = {
      id,
      name,
      emoji: "📍",
      lat: location.latitude,
      lng: location.longitude,
      radius_m: settings?.geofence_radius_m ?? 150,
    };
    activateGeofence(place.lat, place.lng, place.radius_m, formatPlaceLabel(place.emoji, place.name), place);
    setCustomPlaceName("");
    toast({ title: `Место «${name}» сохранено`, description: "Можно переключать одним нажатием." });
  };

  const deleteSavedPlace = (placeId: string) => {
    setSavedPlaces(removeSavedPlace(childId, placeId));
  };

  const buildRoute = async (mode: TravelMode) => {
    if (!location) {
      toast({
        title: "Нет местоположения ребёнка",
        description: "Дождитесь координат с телефона ребёнка.",
        variant: "destructive",
      });
      return;
    }
    setRouteMode(mode);
    try {
      const parent = await refreshParentLocation();
      setShowRoute(true);
      const dist = distanceMeters(parent, {
        lat: location.latitude,
        lng: location.longitude,
      });
      toast({
        title: mode === "walking" ? "Маршрут пешком" : "Маршрут на машине",
        description: `До ${childName} ≈ ${formatDistance(dist)}. Ваше место обновляется каждую минуту.`,
      });
    } catch (e) {
      toast({
        title: "Не удалось определить ваше место",
        description:
          e instanceof Error
            ? e.message
            : "Разрешите геопозицию браузеру и нажмите «Разрешить снова».",
        variant: "destructive",
      });
    }
  };

  const childPoint = location
    ? { lat: location.latitude, lng: location.longitude }
    : null;

  const distanceToChild =
    parentLocation && childPoint ? distanceMeters(parentLocation, childPoint) : null;

  const applySearchedPlace = (payload: SelectedPlacePayload, save: boolean) => {
    const label = formatPlaceLabel(payload.emoji, payload.name);
    const saved: SavedPlace | undefined = save
      ? {
          id: `addr-${Date.now()}`,
          name: payload.name,
          emoji: payload.emoji,
          lat: payload.lat,
          lng: payload.lng,
          radius_m: payload.radius_m,
        }
      : undefined;
    activateGeofence(payload.lat, payload.lng, payload.radius_m, label, saved);
    toast({
      title: `Зона «${payload.name}» установлена`,
      description: payload.address,
    });
  };

  // Sign URLs for fulfilled monitoring results
  useEffect(() => {
    const fetchUrls = async () => {
      const updates: Record<string, string> = {};
      for (const r of requests) {
        if (r.status === "fulfilled" && r.result_path && !signedUrls[r.id]) {
          const { data } = await supabase.storage
            .from("monitoring")
            .createSignedUrl(r.result_path, 3600);
          if (data?.signedUrl) updates[r.id] = data.signedUrl;
        }
      }
      if (Object.keys(updates).length) {
        setSignedUrls((p) => ({ ...p, ...updates }));
      }
    };
    fetchUrls();
  }, [requests, signedUrls]);

  const request = async (type: "photo" | "audio" | "location") => {
    if (!user?.id) return;
    setRequesting(type);
    const { data: inserted, error } = await supabase
      .from("monitoring_requests")
      .insert([{ parent_id: user.id, child_id: childId, request_type: type }])
      .select("id")
      .single();
    setRequesting(null);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Запрос отправлен",
      description:
        type === "location"
          ? "Ждём ответ с телефона ребёнка — приложение должно быть открыто."
          : "Ребёнок получит уведомление и приложение выполнит запрос.",
    });

    if (type === "location" && inserted?.id) {
      const requestId = inserted.id;
      const started = Date.now();
      const poll = window.setInterval(async () => {
        const { data: reqRow } = await supabase
          .from("monitoring_requests")
          .select("status, result_data")
          .eq("id", requestId)
          .maybeSingle();

        if (reqRow?.status === "fulfilled") {
          window.clearInterval(poll);
          await loadData();
          toast({ title: "📍 Местоположение получено" });
          return;
        }
        if (reqRow?.status === "failed") {
          window.clearInterval(poll);
          const errMsg =
            (reqRow.result_data as { error?: string } | null)?.error ||
            "Ребёнок не смог отправить координаты";
          toast({ title: "Не удалось получить местоположение", description: errMsg, variant: "destructive" });
          return;
        }
        if (Date.now() - started > 45_000) {
          window.clearInterval(poll);
          toast({
            title: "Нет ответа",
            description: "Попросите ребёнка открыть приложение и нажать «Отправить сейчас» в жёлтой плашке.",
            variant: "destructive",
          });
        }
      }, 2000);
    }
  };

  const resolveSOS = async (id: string) => {
    await supabase
      .from("sos_alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
  };

  const activeAlert = alerts.find((a) => a.status === "active");

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <Card className={isLocationFresh ? "border-green-300 bg-green-50/40" : "border-amber-200 bg-amber-50/40"}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                {isLocationFresh ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    Связь с телефоном {childName} активна
                  </>
                ) : location ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Данные устарели — попросите открыть приложение
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                    Ожидаем первую геопозицию
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {settings?.location_enabled
                  ? `Автоотправка каждые ${formatInterval(settings.location_interval_seconds)}`
                  : "Автоотправка выключена — включите ниже"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={requesting !== null}
              onClick={() => request("location")}
              className="gap-1"
            >
              {requesting === "location" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              Где сейчас?
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SOS active banner */}
      {activeAlert && (
        <Card className="border-2 border-destructive bg-destructive/10 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-8 h-8 text-destructive shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-lg text-destructive">🚨 SOS от {childName}!</h3>
                <p className="text-sm">{activeAlert.message}</p>
                {activeAlert.latitude != null && activeAlert.longitude != null && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <a
                      href={`https://www.google.com/maps?q=${activeAlert.latitude},${activeAlert.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline text-sm"
                    >
                      <MapPin className="w-4 h-4" />
                      Открыть на карте
                    </a>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 gap-1"
                      onClick={async () => {
                        if (activeAlert.latitude == null || activeAlert.longitude == null) return;
                        const dest = { lat: activeAlert.latitude, lng: activeAlert.longitude };
                        try {
                          const parent = await getParentLocation();
                          window.open(googleMapsDirectionsUrl(parent, dest), "_blank");
                        } catch {
                          window.open(
                            `https://www.google.com/maps?q=${dest.lat},${dest.lng}`,
                            "_blank",
                          );
                        }
                      }}
                    >
                      <Route className="w-3 h-3" />
                      Как добраться
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activeAlert.created_at), {
                    addSuffix: true,
                    locale: ru,
                  })}
                </p>
              </div>
              <Button size="sm" onClick={() => resolveSOS(activeAlert.id)}>
                <CheckCircle className="w-4 h-4 mr-1" /> Принято
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5" /> Местоположение и маршрут
          </CardTitle>
          <CardDescription>
            Карта обновляется каждые 5 сек. Оранжевая линия — куда ребёнок ходил. Синяя — как вам
            добраться.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {location ? (
            <>
              {(parentPermission === "denied" || parentGeoError) && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
                  <p>
                    📍 <strong>Ваша геопозиция:</strong>{" "}
                    {parentPermission === "denied"
                      ? "доступ запрещён. Включите в настройках браузера для этого сайта."
                      : parentGeoError}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingParentGeo}
                    onClick={async () => {
                      const ok = await requestGeoPermissionInteractive();
                      if (ok) {
                        await refreshParentLocation().catch(() => {});
                        setShowRoute(true);
                      }
                    }}
                  >
                    {loadingParentGeo ? "…" : "Разрешить снова"}
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={loadingParentGeo}
                  onClick={() => buildRoute("driving")}
                  className="gap-1"
                >
                  {loadingParentGeo && routeMode === "driving" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Car className="w-4 h-4" />
                  )}
                  Как доехать
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingParentGeo}
                  onClick={() => buildRoute("walking")}
                  className="gap-1"
                >
                  {loadingParentGeo && routeMode === "walking" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Footprints className="w-4 h-4" />
                  )}
                  Пешком
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingParentGeo}
                  onClick={() => refreshParentLocation().then(() => setShowRoute(true)).catch(() => {})}
                  className="gap-1"
                >
                  {loadingParentGeo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                  Моё место
                </Button>
                {parentLocation && childPoint && (
                  <a
                    href={googleMapsDirectionsUrl(parentLocation, childPoint, routeMode)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" variant="secondary" className="gap-1">
                      <ExternalLink className="w-4 h-4" />
                      Навигатор
                    </Button>
                  </a>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowRoute(false);
                    clearParentLocation();
                  }}
                >
                  Скрыть маршрут
                </Button>
              </div>

              {parentLocUpdatedAt && parentLocation && (
                <p className="text-xs text-muted-foreground">
                  Ваше место обновлено{" "}
                  {formatDistanceToNow(new Date(parentLocUpdatedAt), { addSuffix: true, locale: ru })}
                  {showRoute ? " · автообновление каждую минуту" : ""}
                </p>
              )}

              {distanceToChild != null && showRoute && (
                <p className="text-sm flex items-center gap-2">
                  <Route className="w-4 h-4 text-primary" />
                  До {childName}: <strong>{formatDistance(distanceToChild)}</strong>
                  {routeMode === "walking" ? " пешком" : " на машине"}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-trail"
                    checked={showTrail}
                    onCheckedChange={setShowTrail}
                  />
                  <Label htmlFor="show-trail" className="cursor-pointer">
                    Путь перемещения (6 ч)
                  </Label>
                </div>
                <span className="text-muted-foreground">
                  👶 ребёнок · 👨 вы · 🟠 трек · 🔵 маршрут
                </span>
              </div>

              <LocationMap
                latitude={location.latitude}
                longitude={location.longitude}
                accuracy={location.accuracy}
                label={childName}
                height={340}
                movementPath={showTrail ? movementPath : []}
                parentLocation={parentLocation}
                showRoute={showRoute}
                routeMode={routeMode}
                geofence={
                  settings?.geofence_enabled && settings.geofence_lat != null && settings.geofence_lng != null
                    ? { lat: settings.geofence_lat, lng: settings.geofence_lng, radius: settings.geofence_radius_m }
                    : null
                }
                onMapClick={(lat, lng) =>
                  saveSettings({ geofence_lat: lat, geofence_lng: lng, geofence_enabled: true })
                }
              />
              {settings?.geofence_enabled && (
                <p className="text-xs text-muted-foreground">
                  💡 Кликните на карте, чтобы переместить центр безопасной зоны
                </p>
              )}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Обновлено{" "}
                    {formatDistanceToNow(new Date(location.created_at), { addSuffix: true, locale: ru })}
                  </p>
                  <p className="font-mono text-xs">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                    {location.accuracy && (
                      <span className="text-muted-foreground"> · ±{Math.round(location.accuracy)}м</span>
                    )}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <Navigation className="w-4 h-4" />В Google Maps
                  </Button>
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Локация ещё не передана. Ребёнок должен открыть приложение и разрешить геопозицию.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tracking settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="w-5 h-5" /> Автоотправка геолокации
          </CardTitle>
          <CardDescription>
            Настройки применяются на телефоне ребёнка автоматически.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="tracking-enabled" className="cursor-pointer">
              Отправлять координаты
            </Label>
            <Switch
              id="tracking-enabled"
              checked={settings?.location_enabled ?? true}
              disabled={savingSettings}
              onCheckedChange={(v) => saveSettings({ location_enabled: v })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Интервал</Label>
              <span className="text-sm font-mono">
                {settings ? formatInterval(settings.location_interval_seconds) : "—"}
              </span>
            </div>
            <Slider
              min={15}
              max={1800}
              step={15}
              value={[settings?.location_interval_seconds ?? 60]}
              disabled={savingSettings || !(settings?.location_enabled ?? true)}
              onValueChange={(v) => setSettings((s) => s ? { ...s, location_interval_seconds: v[0] } : s)}
              onValueCommit={(v) => saveSettings({ location_interval_seconds: v[0] })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15 сек</span>
              <span>30 мин</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[30, 60, 300, 900].map((s) => (
              <Button
                key={s}
                variant={settings?.location_interval_seconds === s ? "default" : "outline"}
                size="sm"
                disabled={savingSettings}
                onClick={() => saveSettings({ location_interval_seconds: s })}
              >
                {s === 300 ? "5 мин" : formatInterval(s)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Интервал применится на телефоне ребёнка автоматически. Держите приложение открытым или
            в фоне — при возврате на экран координаты отправятся сразу.
          </p>
        </CardContent>
      </Card>

      {/* Geofence settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" /> Безопасная зона (геозона)
          </CardTitle>
          <CardDescription>
            Найдите садик или школу по адресу — или укажите вручную, где ребёнок сейчас.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeZoneLabel && settings?.geofence_enabled && (
            <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm">
              <span className="font-medium">Сейчас следим: </span>
              {activeZoneLabel}
              <span className="text-muted-foreground"> · радиус {settings.geofence_radius_m} м</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="geofence-enabled" className="cursor-pointer">
              Включить геозону
            </Label>
            <Switch
              id="geofence-enabled"
              checked={settings?.geofence_enabled ?? false}
              disabled={savingSettings}
              onCheckedChange={(v) => saveSettings({ geofence_enabled: v })}
            />
          </div>

          <PlaceAddressSearch
            childName={childName}
            childLocation={
              location ? { lat: location.latitude, lng: location.longitude } : null
            }
            disabled={savingSettings}
            onSelectPlace={applySearchedPlace}
            onManualCurrent={(preset) => applyAtCurrentLocation(preset, true)}
          />

          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="custom-place">Или вручную — название без поиска</Label>
            <div className="flex gap-2">
              <Input
                id="custom-place"
                placeholder="Например: Садик на Ленина"
                value={customPlaceName}
                onChange={(e) => setCustomPlaceName(e.target.value)}
                disabled={!location || savingSettings}
              />
              <Button
                variant="secondary"
                disabled={!location || savingSettings}
                onClick={saveCustomPlace}
                className="shrink-0 gap-1"
              >
                <BookmarkPlus className="w-4 h-4" />
                Сохранить
              </Button>
            </div>
          </div>

          {savedPlaces.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Мои сохранённые места
              </Label>
              <ScrollArea className="max-h-[180px]">
                <div className="space-y-2 pr-2">
                  {savedPlaces.map((place) => (
                    <div
                      key={place.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 justify-start text-xs h-auto py-2"
                        disabled={savingSettings}
                        onClick={() => applySavedPlace(place)}
                      >
                        {place.emoji} {place.name}
                        <span className="text-muted-foreground ml-1">· {place.radius_m} м</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive"
                        onClick={() => deleteSavedPlace(place.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex gap-2 flex-wrap pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={!location || savingSettings}
              onClick={() =>
                location &&
                activateGeofence(
                  location.latitude,
                  location.longitude,
                  settings?.geofence_radius_m ?? 300,
                  "📍 Текущее место",
                )
              }
            >
              <Crosshair className="w-4 h-4 mr-1" />
              Зона = где сейчас
            </Button>
            {settings?.geofence_lat != null && (
              <Button
                variant="ghost"
                size="sm"
                disabled={savingSettings}
                onClick={() => {
                  saveSettings({ geofence_lat: null, geofence_lng: null, geofence_enabled: false });
                  persistGeofenceLabel(childId, null);
                  setActiveZoneLabel(null);
                }}
              >
                Очистить зону
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Радиус</Label>
              <span className="text-sm font-mono">
                {settings ? `${settings.geofence_radius_m} м` : "—"}
              </span>
            </div>
            <Slider
              min={50}
              max={5000}
              step={50}
              value={[settings?.geofence_radius_m ?? 300]}
              disabled={savingSettings || !(settings?.geofence_enabled ?? false)}
              onValueChange={(v) => setSettings((s) => s ? { ...s, geofence_radius_m: v[0] } : s)}
              onValueCommit={(v) => saveSettings({ geofence_radius_m: v[0] })}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50 м</span>
              <span>5 км</span>
            </div>
          </div>

          {settings?.geofence_enabled && settings.geofence_lat != null && (
            <p className="text-xs text-muted-foreground font-mono">
              {activeZoneLabel ? `${activeZoneLabel} · ` : ""}
              {settings.geofence_lat.toFixed(5)}, {settings.geofence_lng?.toFixed(5)}
            </p>
          )}

          {geoEvents.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-1">События зоны</p>
              {geoEvents.slice(0, 5).map((ev) => (
                <div key={ev.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    {ev.event_type === "exit" ? (
                      <ShieldAlert className="w-3 h-3 text-destructive" />
                    ) : (
                      <Shield className="w-3 h-3 text-primary" />
                    )}
                    {ev.event_type === "exit" ? "Вышел из зоны" : "Вернулся в зону"}
                    {ev.distance_m != null && (
                      <span className="text-muted-foreground">· {Math.round(ev.distance_m)}м</span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: ru })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Проверить сейчас</CardTitle>
          <CardDescription>
            Ребёнок увидит уведомление о проверке (без скрытого слежения).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            disabled={requesting !== null}
            onClick={() => request("location")}
            className="flex-col h-auto py-3 gap-1"
          >
            {requesting === "location" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
            <span className="text-xs">Где он?</span>
          </Button>
          <Button
            variant="outline"
            disabled={requesting !== null}
            onClick={() => request("photo")}
            className="flex-col h-auto py-3 gap-1"
          >
            {requesting === "photo" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            <span className="text-xs">Фото</span>
          </Button>
          <Button
            variant="outline"
            disabled={requesting !== null}
            onClick={() => request("audio")}
            className="flex-col h-auto py-3 gap-1"
          >
            {requesting === "audio" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
            <span className="text-xs">Звук 5с</span>
          </Button>
        </CardContent>
      </Card>

      {/* History of monitoring results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">История проверок</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Пока пусто</p>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={r.status === "fulfilled" ? "default" : "secondary"}>
                        {r.request_type === "photo"
                          ? "📷 Фото"
                          : r.request_type === "audio"
                          ? "🎤 Звук"
                          : "📍 Локация"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </span>
                    </div>
                    {r.status === "pending" && (
                      <p className="text-xs text-muted-foreground">Ожидаем ответа…</p>
                    )}
                    {r.status === "fulfilled" && r.result_path && signedUrls[r.id] && (
                      <>
                        {r.request_type === "photo" && (
                          <img
                            src={signedUrls[r.id]}
                            alt="фото"
                            className="rounded mt-2 max-w-full"
                          />
                        )}
                        {r.request_type === "audio" && (
                          <audio controls src={signedUrls[r.id]} className="w-full mt-2" />
                        )}
                      </>
                    )}
                    {r.status === "failed" && (
                      <p className="text-xs text-destructive">Не удалось выполнить</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* SOS history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertOctagon className="w-5 h-5" /> История SOS
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">SOS пока не было</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-lg ${a.status === "active" ? "bg-destructive/10" : "bg-muted/50"}`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={a.status === "active" ? "destructive" : "secondary"}>
                      {a.status === "active" ? "АКТИВЕН" : "Решено"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </span>
                  </div>
                  {a.latitude != null && a.longitude != null && (
                    <a
                      href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline"
                    >
                      Открыть на карте
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
