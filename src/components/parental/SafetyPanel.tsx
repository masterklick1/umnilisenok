import { useLanguage, type Translate } from "@/contexts/LanguageContext";
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
import { MapPin, AlertOctagon, Camera, Mic, Navigation, CheckCircle, Loader2, Timer, Shield, ShieldAlert, Crosshair, BookmarkPlus, Trash2, Route, Car, Footprints, ExternalLink, Battery, School } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";
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
import {
  deleteSavedPlaceDb,
  fetchPlaceStatus,
  fetchSavedPlaces,
  upsertSavedPlaceDb,
  updatePlaceRadiusDb,
  type ChildPlaceStatusRow,
} from "@/lib/child-places-service";
import type { DbSavedPlace } from "@/lib/smart-places";
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
  device_source?: "phone" | "watch" | string;
  battery_level?: number | null;
  created_at: string;
}

interface TrailPoint {
  latitude: number;
  longitude: number;
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

const formatInterval = (sec: number, t: Translate) => {
  if (sec < 60) return t(`${sec} сек`, `${sec} sec`);
  const m = Math.round(sec / 60);
  return m < 60 ? t(`${m} мин`, `${m} min`) : t(`${Math.round(m / 60)} ч`, `${Math.round(m / 60)} hr`);
};

const formatDeviceSource = (source?: string | null) =>
  source === "watch" ? "⌚ часы" : "📱 телефон";

interface Settings {
  location_enabled: boolean;
  location_interval_seconds: number;
  geofence_enabled: boolean;
  geofence_lat: number | null;
  geofence_lng: number | null;
  geofence_radius_m: number;
  school_mode_enabled: boolean;
  school_start: string;
  school_end: string;
}

interface GeofenceEvent {
  id: string;
  event_type: string;
  latitude: number;
  longitude: number;
  distance_m: number | null;
  created_at: string;
  place_name?: string | null;
  status_hint?: string | null;
}

const DEFAULT_SETTINGS: Settings = {
  location_enabled: true,
  location_interval_seconds: 60,
  geofence_enabled: false,
  geofence_lat: null,
  geofence_lng: null,
  geofence_radius_m: 300,
  school_mode_enabled: false,
  school_start: "08:00",
  school_end: "14:00",
};

export const SafetyPanel = ({ childId, childName }: Props) => {
  const { t, language } = useLanguage();
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
  const [dbPlaces, setDbPlaces] = useState<DbSavedPlace[]>([]);
  const [placeStatus, setPlaceStatus] = useState<ChildPlaceStatusRow | null>(null);
  const [activeZoneLabel, setActiveZoneLabel] = useState<string | null>(null);
  const [customPlaceName, setCustomPlaceName] = useState("");
  const [movementPath, setMovementPath] = useState<LatLng[]>([]);
  const [trailPoints, setTrailPoints] = useState<TrailPoint[]>([]);
  const [showRoute, setShowRoute] = useState(false);
  const [routeMode, setRouteMode] = useState<TravelMode>("driving");
  const [showTrail, setShowTrail] = useState(true);
  const [detectingPlace, setDetectingPlace] = useState(false);
  const [showParentManualForm, setShowParentManualForm] = useState(false);
  const [parentLatInput, setParentLatInput] = useState("");
  const [parentLngInput, setParentLngInput] = useState("");

  const {
    location: parentLocation,
    effectiveLocation: effectiveParentLocation,
    permission: parentPermission,
    error: parentGeoError,
    loading: loadingParentGeo,
    lastUpdatedAt: parentLocUpdatedAt,
    source: parentLocSource,
    refresh: refreshParentLocation,
    setManualLocation: setParentManualLocation,
  } = useParentLocation({ active: true, routeActive: showRoute, refreshIntervalSec: 60 });

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("child_settings")
      .select("location_enabled, location_interval_seconds, geofence_enabled, geofence_lat, geofence_lng, geofence_radius_m, school_mode_enabled, school_start, school_end")
      .eq("child_id", childId)
      .maybeSingle();
    setSettings({ ...DEFAULT_SETTINGS, ...(data ?? {}) });
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
          school_mode_enabled: next.school_mode_enabled,
          school_start: next.school_start,
          school_end: next.school_end,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "child_id" }
      );
    setSavingSettings(false);
    if (error) toast({ title: t("Не удалось сохранить", "Couldn’t save"), description: error.message, variant: "destructive" });
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
        .from("geofence_events")
        .select("*")
        .eq("child_id", childId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (loc.data) setLocation(loc.data as Location);
    if (history.data) {
      const rows = history.data as TrailPoint[];
      setTrailPoints(rows);
      setMovementPath(rows.map((p) => ({ lat: p.latitude, lng: p.longitude })));
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
          const ev = payload.new as GeofenceEvent;
          loadData();
          const placeLabel = ev.place_name?.replace(/^[^\s]+\s/, "") || ev.place_name || "";
          const isGoingHome = ev.status_hint === "going_home";
          let title: string;
          if (ev.event_type === "enter") {
            title = placeLabel ? t(`✅ ${childName} в ${ev.place_name || placeLabel}`, `✅ ${childName} is at ${ev.place_name || placeLabel}`) : t(`✅ ${childName} пришёл в зону`, `✅ ${childName} entered the safe zone`);
          } else if (isGoingHome) {
            title = t(`🏠 ${childName} идёт домой`, `🏠 ${childName} is heading home`);
          } else {
            title = placeLabel
              ? t(`⚠️ ${childName} вышел из «${placeLabel}»`, `⚠️ ${childName} left ${placeLabel}`)
              : t(`⚠️ ${childName} вышел из зоны`, `⚠️ ${childName} left the safe zone`);
          }
          toast({
            title,
            description: ev.distance_m ? t(`${Math.round(ev.distance_m)} м от центра`, `${Math.round(ev.distance_m)} m from the center`) : undefined,
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
      (settings?.location_interval_seconds ?? 60) * 3 * 1000 + 30_000;

  useEffect(() => {
    const loadPlaces = async () => {
      const rows = await fetchSavedPlaces(childId);
      setDbPlaces(rows);
      setSavedPlaces(
        rows.map((p) => ({
          id: p.place_key,
          name: p.name,
          emoji: p.emoji,
          lat: p.latitude,
          lng: p.longitude,
          radius_m: p.radius_m,
        })),
      );
      if (rows.length === 0) {
        setSavedPlaces(loadSavedPlaces(childId));
        setActiveZoneLabel(loadGeofenceLabel(childId));
      }
    };
    loadPlaces();
    fetchPlaceStatus(childId).then(setPlaceStatus);

    const ch = supabase
      .channel(`place-status-${childId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "child_place_status", filter: `child_id=eq.${childId}` },
        (payload) => setPlaceStatus(payload.new as ChildPlaceStatusRow),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "child_saved_places", filter: `child_id=eq.${childId}` },
        () => loadPlaces(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
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
      await upsertSavedPlaceDb(childId, saveAsPlace);
      const rows = await fetchSavedPlaces(childId);
      setDbPlaces(rows);
    }
  };

  const applyCoordsAsPlace = (
    lat: number,
    lng: number,
    preset: GeofencePreset,
    nameOverride?: string,
    save = true,
    sourceHint?: string,
  ) => {
    const name = nameOverride || preset.name;
    const label = formatPlaceLabel(preset.emoji, name);
    const place: SavedPlace = {
      id: preset.id.startsWith("custom") || preset.id === "addr" ? `custom-${Date.now()}` : preset.id,
      name,
      emoji: preset.emoji,
      lat,
      lng,
      radius_m: preset.radius_m,
    };
    activateGeofence(lat, lng, preset.radius_m, label, save ? place : undefined);
    toast({
      title: t(`«${name}» установлено`, `${name} set`),
      description: sourceHint || preset.hint,
    });
  };

  const applyMyPlaceAuto = async (preset: GeofencePreset) => {
    setDetectingPlace(true);
    try {
      const parent = await refreshParentLocation();
      applyCoordsAsPlace(parent.lat, parent.lng, preset, preset.name, true, t("Определено по вашему GPS", "Found using your GPS"));
    } catch {
      const homePlace = savedPlaces.find((p) => p.id === "home") ?? savedPlaces[0];
      if (homePlace) {
        applyCoordsAsPlace(
          homePlace.lat,
          homePlace.lng,
          { ...preset, name: homePlace.name, emoji: homePlace.emoji },
          homePlace.name,
          false,
          t("Использовано сохранённое место (GPS недоступен)", "Used your saved location because GPS was unavailable"),
        );
        return;
      }
      if (location) {
        applyCoordsAsPlace(
          location.latitude,
          location.longitude,
          preset,
          preset.name,
          true,
          t(`GPS недоступен — взяли место, где ${childName} сейчас`, `GPS was unavailable, so we used ${childName}’s latest location`),
        );
      } else if (effectiveParentLocation) {
        applyCoordsAsPlace(
          effectiveParentLocation.lat,
          effectiveParentLocation.lng,
          preset,
          preset.name,
          true,
          t("Использованы сохранённые координаты родителя", "Used the parent’s saved coordinates"),
        );
      } else {
        toast({
          title: t("Не удалось определить место", "Couldn’t find the location"),
          description: t("Разрешите геопозицию или укажите координаты вручную.", "Allow location access or enter coordinates manually."),
          variant: "destructive",
        });
      }
    } finally {
      setDetectingPlace(false);
    }
  };

  const applyManualPlace = (
    lat: number,
    lng: number,
    name: string,
    preset: GeofencePreset | null,
  ) => {
    const p =
      preset ??
      ({
        id: "custom",
        emoji: "📍",
        name,
        radius_m: settings?.geofence_radius_m ?? 150,
        hint: t("Указано вручную", "Entered manually"),
      } as GeofencePreset);
    applyCoordsAsPlace(lat, lng, p, name, true, t("Координаты указаны вручную", "Coordinates were entered manually"));
  };

  const applyAtCurrentLocation = (preset: GeofencePreset, alsoSave: boolean) => {
    if (!location) {
      toast({
        title: t("Нет координат", "Coordinates unavailable"),
        description: t(`Когда ${childName} будет в нужном месте — откройте приложение на его телефоне и нажмите снова.`, `When ${childName} is at the place, open the app on their phone and try again.`),
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
      title: t(`Зона «${preset.name}» включена`, `${preset.name} safe zone enabled`),
      description: t(`${preset.hint}. Уведомим, если ${childName} выйдет из зоны.${alsoSave ? " Место сохранено." : ""}`, `${preset.hint}. We’ll notify you if ${childName} leaves the zone.${alsoSave ? " Place saved." : ""}`),
    });
  };

  const applySavedPlace = (place: SavedPlace) => {
    const label = formatPlaceLabel(place.emoji, place.name);
    activateGeofence(place.lat, place.lng, place.radius_m, label);
    toast({
      title: t(`Зона «${place.name}» включена`, `${place.name} safe zone enabled`),
      description: t(`Следим за сохранённым местом (радиус ${place.radius_m} м).`, `Monitoring this saved place with a ${place.radius_m} m radius.`),
    });
  };

  const saveCustomPlace = () => {
    if (!location) {
      toast({
        title: t("Нет координат", "Coordinates unavailable"),
        description: t("Дождитесь геопозиции с телефона ребёнка.", "Wait for a location update from your child’s phone."),
        variant: "destructive",
      });
      return;
    }
    const name = customPlaceName.trim() || t("Моё место", "My location");
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
    toast({ title: t(`Место «${name}» сохранено`, `${name} saved`), description: t("Можно переключать одним нажатием.", "Switch to this place with one tap.") });
  };

  const deleteSavedPlace = async (placeId: string) => {
    setSavedPlaces(removeSavedPlace(childId, placeId));
    await deleteSavedPlaceDb(childId, placeId);
    setDbPlaces((prev) => prev.filter((p) => p.place_key !== placeId));
  };

  const updatePlaceRadius = async (placeKey: string, radius_m: number) => {
    const db = dbPlaces.find((p) => p.place_key === placeKey);
    if (!db) return;
    await updatePlaceRadiusDb(db.id, radius_m);
    setSavedPlaces((prev) =>
      prev.map((p) => (p.id === placeKey ? { ...p, radius_m } : p)),
    );
    setDbPlaces((prev) =>
      prev.map((p) => (p.place_key === placeKey ? { ...p, radius_m } : p)),
    );
  };

  const buildRoute = async (mode: TravelMode) => {
    if (!location) {
      toast({
        title: t("Нет местоположения ребёнка", "Child’s location unavailable"),
        description: t("Дождитесь координат с телефона ребёнка.", "Wait for coordinates from your child’s phone."),
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
        title: mode === "walking" ? t("Маршрут пешком", "Walking directions") : t("Маршрут на машине", "Driving directions"),
        description: t(`До ${childName} ≈ ${formatDistance(dist)}. Ваше место обновляется каждую минуту.`, `About ${formatDistance(dist)} to ${childName}. Your location updates every minute.`),
      });
    } catch (e) {
      toast({
        title: t("Не удалось определить ваше место", "Couldn’t find your location"),
        description:
          e instanceof Error
            ? e.message
            : t("Разрешите геопозицию браузеру и нажмите «Разрешить снова».", "Allow location access in your browser, then select “Retry GPS.”"),
        variant: "destructive",
      });
    }
  };

  const childPoint = location
    ? { lat: location.latitude, lng: location.longitude }
    : null;

  // Куда центрировать карту, пока точки ребёнка нет: место родителя → сохранённое место → Москва.
  const fallbackCenter: LatLng =
    effectiveParentLocation ??
    (savedPlaces.length > 0
      ? { lat: savedPlaces[0].lat, lng: savedPlaces[0].lng }
      : { lat: 55.7558, lng: 37.6173 });



  const distanceToChild =
    effectiveParentLocation && childPoint
      ? distanceMeters(effectiveParentLocation, childPoint)
      : null;

  const showMyLocationOnMap = async () => {
    setShowParentManualForm(false);
    try {
      await refreshParentLocation();
      setShowRoute(true);
      toast({
        title: t("Ваше место на карте", "Your location on the map"),
        description:
          parentLocSource === "manual"
            ? t("Используются сохранённые координаты.", "Using saved coordinates.")
            : t("Обновляется по GPS.", "Updates using GPS."),
      });
    } catch {
      setShowParentManualForm(true);
      toast({
        title: t("GPS не ответил", "GPS is unavailable"),
        description: t("Укажите координаты вручную — они сохранятся для следующего раза.", "Enter coordinates manually to save them for next time."),
        variant: "destructive",
      });
    }
  };

  const applyManualParentLocation = () => {
    const lat = parseFloat(parentLatInput.replace(",", "."));
    const lng = parseFloat(parentLngInput.replace(",", "."));
    if (Number.isNaN(lat) || lat < -90 || lat > 90 || Number.isNaN(lng) || lng < -180 || lng > 180) {
      toast({
        title: t("Неверные координаты", "Invalid coordinates"),
        description: t("Пример: 55.751244 и 37.618423", "Example: 55.751244 and 37.618423"),
        variant: "destructive",
      });
      return;
    }
    setParentManualLocation({ lat, lng });
    setShowRoute(true);
    setShowParentManualForm(false);
    toast({ title: t("Ваше место сохранено", "Your location was saved"), description: t("Будет использоваться, пока GPS недоступен.", "This location is used when GPS is unavailable.") });
  };

  const applySearchedPlace = async (payload: SelectedPlacePayload, save: boolean) => {
    const label = formatPlaceLabel(payload.emoji, payload.name);
    const placeKey = payload.name.toLowerCase().includes("школ")
      ? "school"
      : payload.name.toLowerCase().includes("сад")
        ? "kindergarten"
        : payload.name.toLowerCase().includes("дом")
          ? "home"
          : `addr-${Date.now()}`;
    const saved: SavedPlace = {
      id: placeKey,
      name: payload.name,
      emoji: payload.emoji,
      lat: payload.lat,
      lng: payload.lng,
      radius_m: payload.radius_m,
    };
    await activateGeofence(payload.lat, payload.lng, payload.radius_m, label, save ? saved : undefined);
    if (save) {
      await upsertSavedPlaceDb(childId, { ...saved, address: payload.address });
    }
    toast({
      title: save ? t(`«${payload.name}» сохранено`, `${payload.name} saved`) : t(`Зона «${payload.name}» установлена`, `${payload.name} safe zone set`),
      description: save
        ? t(`Уведомим, когда ${childName} придёт или уйдёт · радиус ${payload.radius_m} м`, `You’ll get an alert when ${childName} enters or leaves the ${payload.radius_m} m zone`)
        : payload.address,
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
      toast({ title: t("Ошибка", "Error"), description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: t("Запрос отправлен", "Request sent"),
      description:
        type === "location"
          ? t("Ребёнку отправлено уведомление — пусть откроет приложение.", "Your child has been notified. Ask them to open the app.")
          : t("Ребёнок получит уведомление и приложение выполнит запрос.", "Your child will receive a notification and the app will handle the request."),
    });

    if (type === "location") {
      supabase.functions
        .invoke("notify-child-poke", { body: { child_id: childId, type: "location" } })
        .catch(() => {});
    }

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
          toast({ title: t("📍 Местоположение получено", "📍 Location received") });
          return;
        }
        if (reqRow?.status === "failed") {
          window.clearInterval(poll);
          const errMsg =
            (reqRow.result_data as { error?: string } | null)?.error ||
            t("Ребёнок не смог отправить координаты", "Your child couldn’t send coordinates");
          toast({ title: t("Не удалось получить местоположение", "Couldn’t get the location"), description: errMsg, variant: "destructive" });
          return;
        }
        if (Date.now() - started > 45_000) {
          window.clearInterval(poll);
          toast({
            title: t("Нет ответа", "No response"),
            description: t("Попросите ребёнка открыть приложение и нажать «Отправить сейчас» в жёлтой плашке.", "Ask your child to open the app and tap “Send now” on the yellow banner."),
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
                    {t("Связь с телефоном", "Phone connection")} {childName} {t("активна", "active")}
                  </>
                ) : location ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    {t("Данные устарели — попросите открыть приложение", "The location is out of date. Ask your child to open the app.")}
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                    {t("Ожидаем первую геопозицию", "Waiting for the first location update")}
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {settings?.location_enabled
                  ? t(`Автоотправка каждые ${formatInterval(settings.location_interval_seconds, t)} · только пока приложение ребёнка открыто`, `Updates every ${formatInterval(settings.location_interval_seconds, t)} while the child’s app is open`)
                  : t("Автоотправка выключена — включите ниже", "Automatic updates are off. Turn them on below.")}
              </p>
              {location?.battery_level != null && (
                <p
                  className={`text-xs mt-1 flex items-center gap-1 ${
                    location.battery_level <= 20 ? "text-destructive font-medium" : "text-muted-foreground"
                  }`}
                >
                  <Battery className="w-3.5 h-3.5" />
                  {t("Батарея устройства:", "Device battery:")} {location.battery_level}%
                  {location.battery_level <= 20 && t(" — скоро связь может пропасть!", " — the device may go offline soon!")}
                </p>
              )}
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
              {t("Где сейчас?", "Find location")}
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
                <h3 className="font-bold text-lg text-destructive">{t("🚨 SOS от", "🚨 SOS from")} {childName}!</h3>
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
                      {t("Открыть на карте", "Open on map")}
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
                      {t("Как добраться", "Directions")}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activeAlert.created_at), {
                    addSuffix: true,
                    locale: language === "en" ? enUS : ru,
                  })}
                </p>
              </div>
              <Button size="sm" onClick={() => resolveSOS(activeAlert.id)}>
                <CheckCircle className="w-4 h-4 mr-1" /> {t("Принято", "Acknowledge")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5" /> {t("Местоположение и маршрут", "Location and directions")}
          </CardTitle>
          <CardDescription>
            {t("Карта обновляется каждые 5 сек. Оранжевая линия — куда ребёнок ходил. Синяя — как вам добраться.", "The map refreshes every five seconds. Orange shows where your child went. Blue shows how to reach them.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {location ? (
            <>
              {(showParentManualForm || parentPermission === "denied" || parentGeoError) && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
                  <p>
                    📍 <strong>{t("Моё место вручную", "Enter my location")}</strong> {t("— если GPS не находит вас автоматически", "— use if GPS can’t find you")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      inputMode="decimal"
                      placeholder={t("Широта", "Latitude")}
                      value={parentLatInput}
                      onChange={(e) => setParentLatInput(e.target.value)}
                      className="h-9 font-mono text-sm"
                    />
                    <Input
                      inputMode="decimal"
                      placeholder={t("Долгота", "Longitude")}
                      value={parentLngInput}
                      onChange={(e) => setParentLngInput(e.target.value)}
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={applyManualParentLocation}>
                      {t("Показать на карте", "Show on map")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingParentGeo}
                      onClick={async () => {
                        const ok = await requestGeoPermissionInteractive();
                        if (ok) {
                          await refreshParentLocation().catch(() => {});
                          setShowRoute(true);
                          setShowParentManualForm(false);
                        }
                      }}
                    >
                      {loadingParentGeo ? "…" : t("Повторить GPS", "Retry GPS")}
                    </Button>
                  </div>
                </div>
              )}

              {(parentPermission === "denied" || parentGeoError) && !showParentManualForm && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
                  <p>
                    📍 <strong>{t("Ваша геопозиция:", "Your location:")}</strong>{" "}
                    {parentPermission === "denied"
                      ? t("доступ запрещён. Включите в настройках браузера для этого сайта.", "access denied. Allow location access for this site in your browser settings.")
                      : parentGeoError}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingParentGeo}
                    onClick={showMyLocationOnMap}
                  >
                    {loadingParentGeo ? "…" : t("Определить или ввести вручную", "Find or enter location")}
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
                  {t("Как доехать", "Driving directions")}
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
                  {t("Пешком", "Walk")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingParentGeo}
                  onClick={showMyLocationOnMap}
                  className="gap-1"
                >
                  {loadingParentGeo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                  {t("Моё место", "My location")}
                </Button>
                {effectiveParentLocation && childPoint && (
                  <a
                    href={googleMapsDirectionsUrl(effectiveParentLocation, childPoint, routeMode)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" variant="secondary" className="gap-1">
                      <ExternalLink className="w-4 h-4" />
                      {t("Навигатор", "Navigation app")}
                    </Button>
                  </a>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRoute(false)}
                >
                  {t("Скрыть маршрут", "Hide directions")}
                </Button>
              </div>

              {parentLocUpdatedAt && effectiveParentLocation && (
                <p className="text-xs text-muted-foreground">
                  {t("Ваше место", "Your location")} {parentLocSource === "manual" ? t("(сохранено вручную) ", "(saved manually) ") : ""}
                  {t("обновлено", "updated")}{" "}
                  {formatDistanceToNow(new Date(parentLocUpdatedAt), { addSuffix: true, locale: language === "en" ? enUS : ru })}
                  {showRoute ? t(" · автообновление каждую минуту", " · updates every minute") : ""}
                </p>
              )}

              {distanceToChild != null && showRoute && (
                <p className="text-sm flex items-center gap-2">
                  <Route className="w-4 h-4 text-primary" />
                  {t("До", "To")} {childName}: <strong>{formatDistance(distanceToChild)}</strong>
                  {routeMode === "walking" ? t(" пешком", " on foot") : t(" на машине", " by car")}
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
                    {t("Путь перемещения (6 ч)", "Location history (6 hr)")}
                  </Label>
                </div>
                <span className="text-muted-foreground">
                  {t("👶 ребёнок · 👨 вы · 📱/⌚ источник · 🟠 трек · 🔵 маршрут", "👶 child · 👨 you · 📱/⌚ device · 🟠 location history · 🔵 directions")}
                </span>
              </div>

              <LocationMap
                latitude={location.latitude}
                longitude={location.longitude}
                accuracy={location.accuracy}
                label={childName}
                height={340}
                movementPath={showTrail ? movementPath : []}
                parentLocation={effectiveParentLocation}
                showRoute={showRoute}
                routeMode={routeMode}
                geofences={savedPlaces.map((place) => ({
                  id: place.id,
                  lat: place.lat,
                  lng: place.lng,
                  radius: place.radius_m,
                  label: `${place.emoji} ${place.name}`,
                }))}
                geofence={
                  settings?.geofence_enabled && settings.geofence_lat != null && settings.geofence_lng != null
                    ? {
                        lat: settings.geofence_lat,
                        lng: settings.geofence_lng,
                        radius: settings.geofence_radius_m,
                        label: activeZoneLabel ?? undefined,
                      }
                    : null
                }
                onMapClick={(lat, lng) => {
                  saveSettings({ geofence_lat: lat, geofence_lng: lng, geofence_enabled: true });
                  persistGeofenceLabel(childId, t("📍 На карте", "📍 On the map"));
                  setActiveZoneLabel(t("📍 На карте", "📍 On the map"));
                }}
              />
              {settings?.geofence_enabled && (
                <p className="text-xs text-muted-foreground">
                  {t("💡 Кликните на карте, чтобы поставить или переместить центр зоны (удобно, если адрес не находится)", "💡 Tap the map to set or move the center of the safe zone")}
                </p>
              )}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("Обновлено", "Updated")}{" "}
                    {formatDistanceToNow(new Date(location.created_at), { addSuffix: true, locale: language === "en" ? enUS : ru })}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {formatDeviceSource(location.device_source)}
                  </Badge>
                  <p className="font-mono text-xs">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                    {location.accuracy && (
                      <span className="text-muted-foreground"> · ±{Math.round(location.accuracy)}{t("м", "m")}</span>
                    )}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <Navigation className="w-4 h-4" />{t("В Google Maps", "Open in Google Maps")}
                  </Button>
                </a>
              </div>

              {/* Маршрут дня — хронология точек */}
              {trailPoints.length > 1 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Route className="w-4 h-4 text-primary" /> {t("Маршрут за последние 6 часов", "Location history over the last 6 hours")}
                  </p>
                  <ScrollArea className="h-40">
                    <ol className="space-y-1.5">
                      {[...trailPoints].reverse().slice(0, 30).map((p, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-muted-foreground w-12 shrink-0">
                            {new Date(p.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? "bg-green-500" : "bg-primary/40"}`} />
                          <a
                            className="font-mono underline decoration-dotted"
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                          </a>
                          {i === 0 && <Badge variant="secondary" className="text-[10px] px-1 py-0">{t("сейчас", "now")}</Badge>}
                        </li>
                      ))}
                    </ol>
                  </ScrollArea>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("Точка ребёнка ещё не пришла. Ребёнок должен открыть приложение и разрешить геопозицию. Карта ниже показывает сохранённые места.", "There’s no location from your child yet. Ask them to open the app and allow location access. Saved places appear on the map below.")}
              </p>
              <LocationMap
                latitude={fallbackCenter.lat}
                longitude={fallbackCenter.lng}
                label={childName}
                height={340}
                geofences={savedPlaces.map((place) => ({
                  id: place.id,
                  lat: place.lat,
                  lng: place.lng,
                  radius: place.radius_m,
                  label: `${place.emoji} ${place.name}`,
                }))}
              />
            </div>
          )}

        </CardContent>
      </Card>

      {/* Tracking settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="w-5 h-5" /> {t("Автоотправка геолокации", "Automatic location updates")}
          </CardTitle>
          <CardDescription>
            {t("Настройки применяются на телефоне ребёнка автоматически.", "These settings apply automatically on your child’s phone.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="tracking-enabled" className="cursor-pointer">
              {t("Отправлять координаты", "Send location updates")}
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
              <Label>{t("Интервал", "Update interval")}</Label>
              <span className="text-sm font-mono">
                {settings ? formatInterval(settings.location_interval_seconds, t) : "—"}
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
              <span>{t("15 сек", "15 sec")}</span>
              <span>{t("30 мин", "30 min")}</span>
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
                {s === 300 ? t("5 мин", "5 min") : formatInterval(s, t)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Интервал применится на телефоне ребёнка. В браузере GPS не работает в «спячке» — попросите включить «Не гасить экран» или нажимайте «Где сейчас?» (придёт уведомление).", "This interval applies on your child’s phone. A sleeping browser can’t get GPS updates. Keep the screen on or use “Find location” to notify your child.")}
          </p>
        </CardContent>
      </Card>

      {/* School mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <School className="w-5 h-5" /> {t("Школьный режим", "School mode")}
          </CardTitle>
          <CardDescription>
            {t("В указанные часы у ребёнка закрываются уроки и игры — остаются только SOS и защита. Применяется на устройстве ребёнка автоматически.", "During these hours, lessons and games are locked while SOS and safety features stay available. This applies automatically on your child’s device.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="school-mode" className="cursor-pointer">
              {t("Включить школьный режим", "Enable school mode")}
            </Label>
            <Switch
              id="school-mode"
              checked={settings?.school_mode_enabled ?? false}
              disabled={savingSettings}
              onCheckedChange={(v) => saveSettings({ school_mode_enabled: v })}
            />
          </div>
          {settings?.school_mode_enabled && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("С", "From")}</Label>
                <Input
                  type="time"
                  className="w-28"
                  value={settings.school_start}
                  disabled={savingSettings}
                  onChange={(e) => setSettings((s) => s ? { ...s, school_start: e.target.value } : s)}
                  onBlur={() => saveSettings({ school_start: settings.school_start })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("До", "To")}</Label>
                <Input
                  type="time"
                  className="w-28"
                  value={settings.school_end}
                  disabled={savingSettings}
                  onChange={(e) => setSettings((s) => s ? { ...s, school_end: e.target.value } : s)}
                  onBlur={() => saveSettings({ school_end: settings.school_end })}
                />
              </div>
              <p className="text-xs text-muted-foreground w-full">
                {t("Например, 08:00–14:00 — время уроков. В эти часы ребёнок увидит экран «Время уроков».", "For example, set 08:00–14:00 to show the School time screen during class.")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geofence settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" /> {t("Безопасная зона (геозона)", "Safe zone")}
          </CardTitle>
          <CardDescription>
            {t("Сохраняйте садик, школу, дом — у каждого свой радиус. Уведомления: «в школе», «вышел», «идёт домой». Статус виден и у ребёнка на телефоне.", "Save preschool, school and home with their own radius. Get alerts when your child arrives, leaves or heads home. The status also appears on your child’s phone.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {placeStatus?.status_message && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
              <span className="font-medium">{t("Сейчас:", "Now:")} </span>
              {placeStatus.status_message}
              <span className="text-xs text-muted-foreground ml-2">
                {formatDistanceToNow(new Date(placeStatus.updated_at), { addSuffix: true, locale: language === "en" ? enUS : ru })}
              </span>
            </div>
          )}
          {activeZoneLabel && settings?.geofence_enabled && (
            <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm">
              <span className="font-medium">{t("Сейчас следим:", "Monitoring:")} </span>
              {activeZoneLabel}
              <span className="text-muted-foreground"> {t("· радиус", "· radius")} {settings.geofence_radius_m} {t("м", "m")}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="geofence-enabled" className="cursor-pointer">
              {t("Включить геозону", "Enable safe zone")}
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
            detectingPlace={detectingPlace}
            onAutoDetectPlace={applyMyPlaceAuto}
            onManualPlace={applyManualPlace}
            onSelectPlace={applySearchedPlace}
            onManualCurrent={(preset) => applyAtCurrentLocation(preset, true)}
          />

          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="custom-place">{t("Или вручную — название без поиска", "Or enter a name manually")}</Label>
            <div className="flex gap-2">
              <Input
                id="custom-place"
                placeholder={t("Например: Садик на Ленина", "For example, Little Oaks Preschool")}
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
                {t("Сохранить", "Save")}
              </Button>
            </div>
          </div>

          {savedPlaces.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("Умные места · уведомления при входе и выходе", "Saved places · arrival and departure alerts")}
              </Label>
              <ScrollArea className="max-h-[280px]">
                <div className="space-y-3 pr-2">
                  {savedPlaces.map((place) => (
                    <div key={place.id} className="p-2 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-start text-xs h-auto py-2"
                          disabled={savingSettings}
                          onClick={() => applySavedPlace(place)}
                        >
                          {place.emoji} {place.name}
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
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] text-muted-foreground w-12">{t("Радиус", "Radius")}</span>
                        <Slider
                          min={50}
                          max={500}
                          step={10}
                          value={[place.radius_m]}
                          disabled={savingSettings}
                          onValueChange={(v) =>
                            setSavedPlaces((prev) =>
                              prev.map((p) => (p.id === place.id ? { ...p, radius_m: v[0] } : p)),
                            )
                          }
                          onValueCommit={(v) => updatePlaceRadius(place.id, v[0])}
                          className="flex-1"
                        />
                        <span className="text-[10px] font-mono w-10">{place.radius_m}{t("м", "m")}</span>
                      </div>
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
                  t("📍 Текущее место", "📍 Current location"),
                )
              }
            >
              <Crosshair className="w-4 h-4 mr-1" />
              {t("Зона = где сейчас", "Use current location")}
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
                {t("Очистить зону", "Clear zone")}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("Радиус", "Radius")}</Label>
              <span className="text-sm font-mono">
                {settings ? t(`${settings.geofence_radius_m} м`, `${settings.geofence_radius_m} m`) : "—"}
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
              <span>{t("50 м", "50 m")}</span>
              <span>{t("5 км", "5 km")}</span>
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
              <p className="text-xs font-semibold text-muted-foreground mb-1">{t("События зоны", "Safe zone activity")}</p>
              {geoEvents.slice(0, 5).map((ev) => (
                <div key={ev.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    {ev.event_type === "exit" ? (
                      <ShieldAlert className="w-3 h-3 text-destructive" />
                    ) : (
                      <Shield className="w-3 h-3 text-primary" />
                    )}
                    {ev.event_type === "exit" ? t("Вышел", "Left") : t("Пришёл", "Arrived")}
                    {ev.place_name ? ` · ${ev.place_name}` : " из зоны"}
                    {ev.status_hint === "going_home" && " → идёт домой"}
                    {ev.distance_m != null && (
                      <span className="text-muted-foreground">· {Math.round(ev.distance_m)}{t("м", "m")}</span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: language === "en" ? enUS : ru })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("Проверить сейчас", "Check now")}</CardTitle>
          <CardDescription>
            {t("Ребёнок увидит уведомление о проверке (без скрытого слежения).", "Your child will see a notification about the request.")}
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
            <span className="text-xs">{t("Где он?", "Find location")}</span>
          </Button>
          <Button
            variant="outline"
            disabled={requesting !== null}
            onClick={() => request("photo")}
            className="flex-col h-auto py-3 gap-1"
          >
            {requesting === "photo" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            <span className="text-xs">{t("Фото", "Photo")}</span>
          </Button>
          <Button
            variant="outline"
            disabled={requesting !== null}
            onClick={() => request("audio")}
            className="flex-col h-auto py-3 gap-1"
          >
            {requesting === "audio" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
            <span className="text-xs">{t("Звук 5с", "5 sec audio")}</span>
          </Button>
        </CardContent>
      </Card>

      {/* History of monitoring results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("История проверок", "Check history")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">{t("Пока пусто", "Nothing yet")}</p>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={r.status === "fulfilled" ? "default" : "secondary"}>
                        {r.request_type === "photo"
                          ? t("📷 Фото", "📷 Photo")
                          : r.request_type === "audio"
                          ? t("🎤 Звук", "🎤 Audio")
                          : t("📍 Локация", "📍 Location")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), {
                          addSuffix: true,
                          locale: language === "en" ? enUS : ru,
                        })}
                      </span>
                    </div>
                    {r.status === "pending" && (
                      <p className="text-xs text-muted-foreground">{t("Ожидаем ответа…", "Waiting for a response…")}</p>
                    )}
                    {r.status === "fulfilled" && r.result_path && signedUrls[r.id] && (
                      <>
                        {r.request_type === "photo" && (
                          <img
                            src={signedUrls[r.id]}
                            alt={t("фото", "photo")}
                            className="rounded mt-2 max-w-full"
                          />
                        )}
                        {r.request_type === "audio" && (
                          <audio controls src={signedUrls[r.id]} className="w-full mt-2" />
                        )}
                      </>
                    )}
                    {r.status === "failed" && (
                      <p className="text-xs text-destructive">{t("Не удалось выполнить", "Couldn’t complete the request")}</p>
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
            <AlertOctagon className="w-5 h-5" /> {t("История SOS", "SOS history")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">{t("SOS пока не было", "No SOS alerts yet")}</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-lg ${a.status === "active" ? "bg-destructive/10" : "bg-muted/50"}`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={a.status === "active" ? "destructive" : "secondary"}>
                      {a.status === "active" ? t("АКТИВЕН", "ACTIVE") : t("Решено", "Resolved")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), {
                        addSuffix: true,
                        locale: language === "en" ? enUS : ru,
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
                      {t("Открыть на карте", "Open on map")}
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
