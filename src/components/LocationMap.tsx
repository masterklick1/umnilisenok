import { useEffect, useId, useRef, useState } from "react";
import { GoogleMap } from "@capacitor/google-maps";
import { loadGoogleMaps } from "@/lib/google-maps";
import { isNative } from "@/lib/platform";
import { getDirections } from "@/lib/maps-client";
import type { LatLng, TravelMode } from "@/lib/route-utils";

declare global {
  interface Window {
    google: any;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "capacitor-google-map": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface Geofence {
  lat: number;
  lng: number;
  radius: number;
  label?: string;
  color?: string;
  id?: string;
}

interface Props {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  label?: string;
  height?: number;
  /** Legacy single zone (highlighted) */
  geofence?: Geofence | null;
  /** All saved smart places shown on map */
  geofences?: Geofence[];
  onMapClick?: (lat: number, lng: number) => void;
  movementPath?: LatLng[];
  parentLocation?: LatLng | null;
  showRoute?: boolean;
  routeMode?: TravelMode;
}

// Ключ для нативной карты. На Android читается из meta-data манифеста, но
// плагин ТРЕБУЕТ передать apiKey в JS — можно передать пустую строку, тогда
// используется значение из манифеста.
const NATIVE_MAP_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_NATIVE_KEY as string | undefined) ?? "";

/**
 * Dual-mode карта:
 *   • native (Capacitor) → рендер через @capacitor/google-maps.
 *   • web/preview → рендер через window.google.maps.Map.
 */
export const LocationMap = (props: Props) => {
  if (isNative()) {
    return <NativeLocationMap {...props} />;
  }
  return <WebLocationMap {...props} />;
};

/* ============================================================
 * Утилиты для управления прозрачностью WebView под нативной картой
 * ============================================================ */
const TRANSPARENCY_STYLE_ID = "capacitor-map-transparency-style";
let activeNativeMaps = 0;

const ensureTransparencyStylesheet = () => {
  if (document.getElementById(TRANSPARENCY_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = TRANSPARENCY_STYLE_ID;
  style.textContent = `
    html.capacitor-map-visible,
    body.capacitor-map-visible {
      background: transparent !important;
    }
    .capacitor-map-transparent-ancestor {
      background: transparent !important;
    }
  `;
  document.head.appendChild(style);
};

interface AncestorSnapshot {
  el: HTMLElement;
  prevInlineBg: string;
  hadClass: boolean;
}

const applyTransparencyChain = (from: HTMLElement | null): AncestorSnapshot[] => {
  ensureTransparencyStylesheet();
  const snapshots: AncestorSnapshot[] = [];
  let el: HTMLElement | null = from;
  while (el && el !== document.body) {
    snapshots.push({
      el,
      prevInlineBg: el.style.background,
      hadClass: el.classList.contains("capacitor-map-transparent-ancestor"),
    });
    el.style.background = "transparent";
    el.classList.add("capacitor-map-transparent-ancestor");
    el = el.parentElement;
  }
  document.documentElement.classList.add("capacitor-map-visible");
  document.body.classList.add("capacitor-map-visible");
  activeNativeMaps += 1;
  return snapshots;
};

const revertTransparencyChain = (snapshots: AncestorSnapshot[]) => {
  for (const s of snapshots) {
    s.el.style.background = s.prevInlineBg;
    if (!s.hadClass) s.el.classList.remove("capacitor-map-transparent-ancestor");
  }
  activeNativeMaps = Math.max(0, activeNativeMaps - 1);
  if (activeNativeMaps === 0) {
    document.documentElement.classList.remove("capacitor-map-visible");
    document.body.classList.remove("capacitor-map-visible");
  }
};

/* ============================================================
 * NATIVE (Capacitor Google Maps SDK)
 * ============================================================ */
const NativeLocationMap = ({
  latitude,
  longitude,
  accuracy,
  label,
  height = 320,
  geofence,
  geofences = [],
  onMapClick,
  movementPath = [],
  parentLocation = null,
  showRoute = false,
  routeMode = "driving",
}: Props) => {
  const containerRef = useRef<HTMLElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const readyRef = useRef<Promise<GoogleMap | null> | null>(null);
  const markerIdsRef = useRef<{
    child?: string;
    parent?: string;
    zones: string[];
  }>({ zones: [] });
  const circleIdsRef = useRef<{ accuracy?: string; zones: string[]; legacy?: string }>({
    zones: [],
  });
  const polylineIdsRef = useRef<{ path?: string; route?: string; fallback?: string }>({});
  const onClickRef = useRef(onMapClick);
  onClickRef.current = onMapClick;
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const mapId = `native-map-${rawId}`;

  // create map once — но только когда DOM элемент реально примонтирован
  useEffect(() => {
    let cancelled = false;
    let snapshots: AncestorSnapshot[] = [];

    /** Ждём, пока контейнер получит стабильные ненулевые размеры. */
    const waitForStableLayout = (el: HTMLElement) =>
      new Promise<boolean>((resolve) => {
        let lastW = -1;
        let lastH = -1;
        let stable = 0;
        let frames = 0;
        const tick = () => {
          if (cancelled) return resolve(false);
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && r.width === lastW && r.height === lastH) {
            stable += 1;
          } else {
            stable = 0;
          }
          lastW = r.width;
          lastH = r.height;
          frames += 1;
          if (stable >= 2) return resolve(true);
          if (frames > 120) return resolve(r.width > 0 && r.height > 0);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

    const init = async () => {
      const el = containerRef.current;
      if (!el) return null;

      setMapError(null);

      const laidOut = await waitForStableLayout(el);
      if (cancelled) return null;
      if (!laidOut) {
        console.error("[map] контейнер карты не получил размеры");
        setMapError("Карта не получила размеры на экране.");
        return null;
      }

      // Пробрасываем прозрачность вверх по дереву, чтобы нативный слой карты
      // (лежит ПОД WebView) не перекрывался белым фоном UI.
      snapshots = applyTransparencyChain(el);

      try {
        let ready = false;
        const map = await GoogleMap.create(
          {
            id: mapId,
            element: el,
            apiKey: NATIVE_MAP_API_KEY, // "" → возьмётся из AndroidManifest meta-data
            config: {
              center: { lat: latitude, lng: longitude },
              zoom: 15,
            },
            forceCreate: true,
          },
          () => {
            ready = true;
          },
        );
        if (cancelled) {
          await map.destroy().catch(() => {});
          return null;
        }
        mapRef.current = map;
        await map
          .setOnMapClickListener((p: { latitude: number; longitude: number }) => {
            onClickRef.current?.(p.latitude, p.longitude);
          })
          .catch(() => {});

        // Если SDK не сообщил о готовности — показываем понятную ошибку,
        // вместо белого квадрата.
        window.setTimeout(() => {
          if (!cancelled && !ready) {
            console.error("[map] нативная карта не сообщила onMapReady за 10 c");
            setMapError("Карта не загрузилась. Проверьте интернет и перезапустите.");
          }
        }, 10_000);

        return map;
      } catch (e) {
        console.error("[map] GoogleMap.create failed:", e);
        if (!cancelled) {
          setMapError("Не удалось открыть карту на этом устройстве.");
          revertTransparencyChain(snapshots);
          snapshots = [];
        }
        return null;
      }
    };

    readyRef.current = init();

    return () => {
      cancelled = true;
      const p = readyRef.current;
      readyRef.current = null;
      (async () => {
        try {
          await p;
          const m = mapRef.current;
          if (m) {
            try {
              await m.removeAllMapListeners();
            } catch {
              /* noop */
            }
            try {
              await m.destroy();
            } catch {
              /* noop */
            }
          }
        } finally {
          mapRef.current = null;
          markerIdsRef.current = { zones: [] };
          circleIdsRef.current = { zones: [] };
          polylineIdsRef.current = {};
          revertTransparencyChain(snapshots);
        }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // apply markers / circles / polylines — ждём готовности карты
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const map = await readyRef.current;
      if (!map || cancelled) return;

      try {
        const center = { lat: latitude, lng: longitude };
        await map.setCamera({ coordinate: center, animate: true });

        // child marker
        if (markerIdsRef.current.child) {
          await map.removeMarker(markerIdsRef.current.child).catch(() => {});
        }
        markerIdsRef.current.child = await map.addMarker({
          coordinate: center,
          title: label || "Ребёнок",
        });

        // parent marker
        if (markerIdsRef.current.parent) {
          await map.removeMarker(markerIdsRef.current.parent).catch(() => {});
          markerIdsRef.current.parent = undefined;
        }
        if (parentLocation) {
          markerIdsRef.current.parent = await map.addMarker({
            coordinate: { lat: parentLocation.lat, lng: parentLocation.lng },
            title: "Вы",
          });
        }

        // zones
        for (const id of markerIdsRef.current.zones) {
          await map.removeMarker(id).catch(() => {});
        }
        markerIdsRef.current.zones = [];
        if (circleIdsRef.current.zones.length) {
          await map.removeCircles(circleIdsRef.current.zones).catch(() => {});
        }
        circleIdsRef.current.zones = [];

        for (const zone of geofences) {
          const color = zone.color ?? "#22c55e";
          const cid = await (map as any).addCircles([
            {
              center: { lat: zone.lat, lng: zone.lng },
              radius: zone.radius,
              strokeColor: color,
              strokeWeight: 2,
              fillColor: color + "22",
            },
          ]);
          circleIdsRef.current.zones.push(...cid);
          const mid = await map.addMarker({
            coordinate: { lat: zone.lat, lng: zone.lng },
            title: zone.label || "Место",
          });
          markerIdsRef.current.zones.push(mid);
        }

        // legacy geofence highlight
        if (circleIdsRef.current.legacy) {
          await map.removeCircles([circleIdsRef.current.legacy]).catch(() => {});
          circleIdsRef.current.legacy = undefined;
        }
        if (geofence) {
          const cid = await (map as any).addCircles([
            {
              center: { lat: geofence.lat, lng: geofence.lng },
              radius: geofence.radius,
              strokeColor: "#2563eb",
              strokeWeight: 3,
              fillColor: "#2563eb10",
            },
          ]);
          circleIdsRef.current.legacy = cid[0];
        }

        // accuracy circle
        if (circleIdsRef.current.accuracy) {
          await map.removeCircles([circleIdsRef.current.accuracy]).catch(() => {});
          circleIdsRef.current.accuracy = undefined;
        }
        if (accuracy && accuracy > 0) {
          const cid = await (map as any).addCircles([
            {
              center,
              radius: accuracy,
              strokeColor: "#3b82f6",
              strokeWeight: 1,
              fillColor: "#3b82f620",
            },
          ]);
          circleIdsRef.current.accuracy = cid[0];
        }

        // movement path
        if (polylineIdsRef.current.path) {
          await map.removePolylines([polylineIdsRef.current.path]).catch(() => {});
          polylineIdsRef.current.path = undefined;
        }
        const pathCoords = [
          ...movementPath.map((p) => ({ lat: p.lat, lng: p.lng })),
          center,
        ];
        if (pathCoords.length >= 2) {
          const ids = await (map as any).addPolylines([
            {
              path: pathCoords,
              strokeColor: "#f97316",
              strokeWeight: 4,
              geodesic: true,
            },
          ]);
          polylineIdsRef.current.path = ids[0];
        }

        // route
        if (polylineIdsRef.current.route) {
          await map.removePolylines([polylineIdsRef.current.route]).catch(() => {});
          polylineIdsRef.current.route = undefined;
        }
        if (polylineIdsRef.current.fallback) {
          await map.removePolylines([polylineIdsRef.current.fallback]).catch(() => {});
          polylineIdsRef.current.fallback = undefined;
        }
        if (showRoute && parentLocation) {
          const dir = await getDirections(parentLocation, center, routeMode);
          if (cancelled) return;
          if (dir?.path?.length) {
            const ids = await (map as any).addPolylines([
              {
                path: dir.path,
                strokeColor: "#2563eb",
                strokeWeight: 5,
              },
            ]);
            polylineIdsRef.current.route = ids[0];
          } else {
            const ids = await (map as any).addPolylines([
              {
                path: [parentLocation, center],
                strokeColor: "#2563eb",
                strokeWeight: 3,
                geodesic: true,
              },
            ]);
            polylineIdsRef.current.fallback = ids[0];
          }
        }
      } catch (e) {
        console.error("Native map update failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    latitude,
    longitude,
    accuracy,
    label,
    geofence?.lat,
    geofence?.lng,
    geofence?.radius,
    geofences,
    movementPath,
    parentLocation?.lat,
    parentLocation?.lng,
    showRoute,
    routeMode,
  ]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ height }}>
      <div
        ref={containerRef}
        className="capacitor-map-transparent-ancestor h-full w-full"
        style={{ background: "transparent" }}
      />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted px-6 text-center text-sm text-muted-foreground">
          Карта не загрузилась. Проверьте подключение и настройки Google Maps.
        </div>
      )}
    </div>
  );
};

/* ============================================================
 * WEB (Google Maps JavaScript API — fallback для preview/desktop)
 * ============================================================ */
const WebLocationMap = ({
  latitude,
  longitude,
  accuracy,
  label,
  height = 320,
  geofence,
  geofences = [],
  onMapClick,
  movementPath = [],
  parentLocation = null,
  showRoute = false,
  routeMode = "driving",
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const childMarkerRef = useRef<any>(null);
  const parentMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const geofenceCircleRef = useRef<any>(null);
  const geofenceMarkerRef = useRef<any>(null);
  const placeCirclesRef = useRef<Map<string, { circle: any; marker: any }>>(new Map());
  const pathLineRef = useRef<any>(null);
  const fallbackLineRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);
  const onClickRef = useRef(onMapClick);

  useEffect(() => {
    onClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        const google = window.google;
        const center = { lat: latitude, lng: longitude };

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(ref.current, {
            center,
            zoom: 15,
            disableDefaultUI: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          });

          childMarkerRef.current = new google.maps.Marker({
            position: center,
            map: mapRef.current,
            title: label || "Ребёнок",
            label: { text: "👶", fontSize: "14px" },
          });

          clickListenerRef.current = mapRef.current.addListener("click", (e: any) => {
            if (onClickRef.current && e.latLng) {
              onClickRef.current(e.latLng.lat(), e.latLng.lng());
            }
          });
        } else {
          childMarkerRef.current?.setPosition(center);
          mapRef.current.panTo(center);
        }

        if (accuracy && accuracy > 0) {
          if (!accuracyCircleRef.current) {
            accuracyCircleRef.current = new google.maps.Circle({
              map: mapRef.current,
              center,
              radius: accuracy,
              strokeColor: "#3b82f6",
              strokeOpacity: 0.5,
              strokeWeight: 1,
              fillColor: "#3b82f6",
              fillOpacity: 0.12,
            });
          } else {
            accuracyCircleRef.current.setCenter(center);
            accuracyCircleRef.current.setRadius(accuracy);
          }
        } else if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setMap(null);
          accuracyCircleRef.current = null;
        }

        const pathCoords = [
          ...movementPath.map((p) => ({ lat: p.lat, lng: p.lng })),
          center,
        ].filter(
          (p, i, arr) =>
            i === 0 || p.lat !== arr[i - 1].lat || p.lng !== arr[i - 1].lng,
        );

        if (pathCoords.length >= 2) {
          if (!pathLineRef.current) {
            pathLineRef.current = new google.maps.Polyline({
              map: mapRef.current,
              path: pathCoords,
              strokeColor: "#f97316",
              strokeOpacity: 0.75,
              strokeWeight: 4,
              geodesic: true,
            });
          } else {
            pathLineRef.current.setPath(pathCoords);
            pathLineRef.current.setMap(mapRef.current);
          }
        } else if (pathLineRef.current) {
          pathLineRef.current.setMap(null);
        }

        const activeIds = new Set<string>();
        for (const zone of geofences) {
          const key = zone.id ?? `${zone.lat},${zone.lng}`;
          activeIds.add(key);
          const color = zone.color ?? "#22c55e";
          const gCenter = { lat: zone.lat, lng: zone.lng };
          let entry = placeCirclesRef.current.get(key);
          if (!entry) {
            const circle = new google.maps.Circle({
              map: mapRef.current,
              center: gCenter,
              radius: zone.radius,
              strokeColor: color,
              strokeOpacity: 0.75,
              strokeWeight: 2,
              fillColor: color,
              fillOpacity: 0.08,
            });
            const marker = new google.maps.Marker({
              map: mapRef.current,
              position: gCenter,
              title: zone.label || "Место",
              label: zone.label
                ? { text: zone.label.slice(0, 2), fontSize: "11px" }
                : undefined,
              icon: zone.label
                ? undefined
                : {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 5,
                    fillColor: color,
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 2,
                  },
            });
            entry = { circle, marker };
            placeCirclesRef.current.set(key, entry);
          } else {
            entry.circle.setCenter(gCenter);
            entry.circle.setRadius(zone.radius);
            entry.circle.setOptions({ strokeColor: color, fillColor: color });
            entry.marker.setPosition(gCenter);
            if (zone.label) entry.marker.setTitle(zone.label);
          }
        }
        for (const [key, entry] of placeCirclesRef.current) {
          if (!activeIds.has(key)) {
            entry.circle.setMap(null);
            entry.marker.setMap(null);
            placeCirclesRef.current.delete(key);
          }
        }

        if (geofence) {
          const gCenter = { lat: geofence.lat, lng: geofence.lng };
          if (!geofenceCircleRef.current) {
            geofenceCircleRef.current = new google.maps.Circle({
              map: mapRef.current,
              center: gCenter,
              radius: geofence.radius,
              strokeColor: "#2563eb",
              strokeOpacity: 0.9,
              strokeWeight: 3,
              fillColor: "#2563eb",
              fillOpacity: 0.06,
            });
            geofenceMarkerRef.current = new google.maps.Marker({
              map: mapRef.current,
              position: gCenter,
              title: geofence.label || "Активная зона",
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: "#2563eb",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              },
            });
          } else {
            geofenceCircleRef.current.setCenter(gCenter);
            geofenceCircleRef.current.setRadius(geofence.radius);
            geofenceMarkerRef.current?.setPosition(gCenter);
          }
        } else {
          geofenceCircleRef.current?.setMap(null);
          geofenceCircleRef.current = null;
          geofenceMarkerRef.current?.setMap(null);
          geofenceMarkerRef.current = null;
        }

        if (parentLocation) {
          const pPos = { lat: parentLocation.lat, lng: parentLocation.lng };
          if (!parentMarkerRef.current) {
            parentMarkerRef.current = new google.maps.Marker({
              position: pPos,
              map: mapRef.current,
              title: "Вы",
              label: { text: "👨", fontSize: "14px" },
            });
          } else {
            parentMarkerRef.current.setPosition(pPos);
            parentMarkerRef.current.setMap(mapRef.current);
          }
        } else if (parentMarkerRef.current) {
          parentMarkerRef.current.setMap(null);
        }

        const bounds = new google.maps.LatLngBounds();
        bounds.extend(center);
        pathCoords.forEach((p) => bounds.extend(p));
        if (parentLocation) bounds.extend(parentLocation);
        geofences.forEach((z) => bounds.extend({ lat: z.lat, lng: z.lng }));
        if (geofence) bounds.extend({ lat: geofence.lat, lng: geofence.lng });
        if (pathCoords.length > 1 || parentLocation || geofences.length > 0) {
          mapRef.current.fitBounds(bounds, 48);
        }

        routeLineRef.current?.setMap(null);
        fallbackLineRef.current?.setMap(null);
        if (showRoute && parentLocation) {
          getDirections(parentLocation, center, routeMode).then((dir) => {
            if (cancelled || !mapRef.current) return;
            if (dir?.path?.length) {
              routeLineRef.current = new google.maps.Polyline({
                map: mapRef.current,
                path: dir.path,
                strokeColor: "#2563eb",
                strokeOpacity: 0.85,
                strokeWeight: 5,
              });
            } else {
              fallbackLineRef.current = new google.maps.Polyline({
                map: mapRef.current,
                path: [parentLocation, center],
                strokeColor: "#2563eb",
                strokeOpacity: 0.6,
                strokeWeight: 3,
                geodesic: true,
              });
            }
          });
        }
      })
      .catch((e) => console.error(e));

    return () => {
      cancelled = true;
    };
  }, [
    latitude,
    longitude,
    accuracy,
    label,
    geofence?.lat,
    geofence?.lng,
    geofence?.radius,
    geofences,
    movementPath,
    parentLocation?.lat,
    parentLocation?.lng,
    showRoute,
    routeMode,
  ]);

  return <div ref={ref} style={{ width: "100%", height, borderRadius: 12 }} />;
};
