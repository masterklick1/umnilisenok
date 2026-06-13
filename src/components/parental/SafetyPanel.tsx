import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, AlertOctagon, Camera, Mic, Navigation, CheckCircle, Loader2, Timer, Shield, ShieldAlert, Crosshair } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { LocationMap } from "@/components/LocationMap";

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
    const [loc, sos, req, geo] = await Promise.all([
      supabase
        .from("child_locations")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
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
    if (sos.data) setAlerts(sos.data as SosAlert[]);
    if (req.data) setRequests(req.data as MonitoringReq[]);
    if (geo.data) setGeoEvents(geo.data as unknown as GeofenceEvent[]);
  }, [childId]);

  useEffect(() => {
    loadData();
    loadSettings();

    const poll = window.setInterval(loadData, 10000);

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

  const applyGeofencePreset = (preset: "school" | "home") => {
    if (!location) {
      toast({
        title: "Нет координат",
        description: "Дождитесь, пока ребёнок откроет приложение и разрешит геопозицию.",
        variant: "destructive",
      });
      return;
    }
    saveSettings({
      geofence_lat: location.latitude,
      geofence_lng: location.longitude,
      geofence_enabled: true,
      geofence_radius_m: preset === "school" ? 200 : 120,
    });
    toast({
      title: preset === "school" ? "Геозона «Школа» установлена" : "Геозона «Дом» установлена",
      description:
        preset === "school"
          ? "Радиус 200 м вокруг текущей точки. Уведомим, если ребёнок выйдет из зоны."
          : "Радиус 120 м вокруг текущей точки.",
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
    const { error } = await supabase.from("monitoring_requests").insert([
      { parent_id: user.id, child_id: childId, request_type: type },
    ]);
    setRequesting(null);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Запрос отправлен",
        description: "Ребёнок получит уведомление и приложение выполнит запрос.",
      });
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
                  <a
                    href={`https://www.google.com/maps?q=${activeAlert.latitude},${activeAlert.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline mt-1"
                  >
                    <MapPin className="w-4 h-4" />
                    Открыть на карте
                  </a>
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
            <MapPin className="w-5 h-5" /> Местоположение
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {location ? (
            <>
              <LocationMap
                latitude={location.latitude}
                longitude={location.longitude}
                accuracy={location.accuracy}
                label={childName}
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
                {formatInterval(s)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Geofence settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" /> Безопасная зона (геозона)
          </CardTitle>
          <CardDescription>
            Уведомление, если ребёнок выходит за пределы заданного круга.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={!location || savingSettings}
              onClick={() => applyGeofencePreset("school")}
            >
              🏫 Школа (здесь, 200 м)
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!location || savingSettings}
              onClick={() => applyGeofencePreset("home")}
            >
              🏠 Дом (здесь, 120 м)
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!location || savingSettings}
              onClick={() =>
                location &&
                saveSettings({
                  geofence_lat: location.latitude,
                  geofence_lng: location.longitude,
                  geofence_enabled: true,
                })
              }
            >
              <Crosshair className="w-4 h-4 mr-1" />
              Текущее место
            </Button>
            {settings?.geofence_lat != null && (
              <Button
                variant="ghost"
                size="sm"
                disabled={savingSettings}
                onClick={() => saveSettings({ geofence_lat: null, geofence_lng: null, geofence_enabled: false })}
              >
                Очистить
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
              Центр: {settings.geofence_lat.toFixed(5)}, {settings.geofence_lng?.toFixed(5)}
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
