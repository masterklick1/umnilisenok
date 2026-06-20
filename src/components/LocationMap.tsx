import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";
import type { LatLng, TravelMode } from "@/lib/route-utils";

declare global {
  interface Window {
    google: any;
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

export const LocationMap = ({
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
  const directionsRendererRef = useRef<any>(null);
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

          directionsRendererRef.current = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: { strokeColor: "#2563eb", strokeWeight: 5, strokeOpacity: 0.85 },
          });
        } else {
          childMarkerRef.current?.setPosition(center);
          mapRef.current.panTo(center);
        }

        // Accuracy circle
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

        // Movement trail
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

        // Saved smart places (multiple circles)
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

        // Legacy active geofence highlight (dashed border feel via thicker stroke)
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

        // Parent marker
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

        // Fit map to show child + trail + parent
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(center);
        pathCoords.forEach((p) => bounds.extend(p));
        if (parentLocation) bounds.extend(parentLocation);
        geofences.forEach((z) => bounds.extend({ lat: z.lat, lng: z.lng }));
        if (geofence) bounds.extend({ lat: geofence.lat, lng: geofence.lng });
        if (pathCoords.length > 1 || parentLocation || geofences.length > 0) {
          mapRef.current.fitBounds(bounds, 48);
        }

        // Route directions
        if (showRoute && parentLocation && directionsRendererRef.current) {
          directionsRendererRef.current.setMap(mapRef.current);
          const service = new google.maps.DirectionsService();
          service.route(
            {
              origin: parentLocation,
              destination: center,
              travelMode:
                routeMode === "walking"
                  ? google.maps.TravelMode.WALKING
                  : google.maps.TravelMode.DRIVING,
            },
            (result: any, status: string) => {
              if (cancelled) return;
              if (status === google.maps.DirectionsStatus.OK && result) {
                directionsRendererRef.current.setDirections(result);
                fallbackLineRef.current?.setMap(null);
              } else {
                directionsRendererRef.current.setMap(null);
                if (!fallbackLineRef.current) {
                  fallbackLineRef.current = new google.maps.Polyline({
                    map: mapRef.current,
                    path: [parentLocation, center],
                    strokeColor: "#2563eb",
                    strokeOpacity: 0.6,
                    strokeWeight: 3,
                    geodesic: true,
                    icons: [
                      {
                        icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
                        offset: "0",
                        repeat: "12px",
                      },
                    ],
                  });
                } else {
                  fallbackLineRef.current.setPath([parentLocation, center]);
                  fallbackLineRef.current.setMap(mapRef.current);
                }
              }
            },
          );
        } else {
          directionsRendererRef.current?.setMap(null);
          fallbackLineRef.current?.setMap(null);
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
