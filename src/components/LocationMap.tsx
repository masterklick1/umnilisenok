import { useEffect, useRef } from "react";

import { loadGoogleMaps } from "@/lib/google-maps";

declare global {
  interface Window {
    google: any;
  }
}

interface Geofence {
  lat: number;
  lng: number;
  radius: number;
}

interface Props {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  label?: string;
  height?: number;
  geofence?: Geofence | null;
  onMapClick?: (lat: number, lng: number) => void;
}

export const LocationMap = ({ latitude, longitude, accuracy, label, height = 280, geofence, onMapClick }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const geofenceCircleRef = useRef<any>(null);
  const geofenceMarkerRef = useRef<any>(null);
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
        const center = { lat: latitude, lng: longitude };
        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(ref.current, {
            center,
            zoom: 16,
            disableDefaultUI: false,
            streetViewControl: false,
            mapTypeControl: false,
          });
          markerRef.current = new window.google.maps.Marker({
            position: center,
            map: mapRef.current,
            title: label,
          });
          if (accuracy && accuracy > 0) {
            circleRef.current = new window.google.maps.Circle({
              map: mapRef.current,
              center,
              radius: accuracy,
              strokeColor: "#3b82f6",
              strokeOpacity: 0.6,
              strokeWeight: 1,
              fillColor: "#3b82f6",
              fillOpacity: 0.15,
            });
          }
          clickListenerRef.current = mapRef.current.addListener("click", (e: any) => {
            if (onClickRef.current && e.latLng) {
              onClickRef.current(e.latLng.lat(), e.latLng.lng());
            }
          });
        } else {
          mapRef.current.panTo(center);
          markerRef.current.setPosition(center);
          if (circleRef.current) {
            circleRef.current.setCenter(center);
            if (accuracy) circleRef.current.setRadius(accuracy);
          }
        }

        // Geofence
        if (geofence) {
          const gCenter = { lat: geofence.lat, lng: geofence.lng };
          if (!geofenceCircleRef.current) {
            geofenceCircleRef.current = new window.google.maps.Circle({
              map: mapRef.current,
              center: gCenter,
              radius: geofence.radius,
              strokeColor: "#22c55e",
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: "#22c55e",
              fillOpacity: 0.1,
            });
            geofenceMarkerRef.current = new window.google.maps.Marker({
              map: mapRef.current,
              position: gCenter,
              title: "Безопасная зона",
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: "#22c55e",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              },
            });
          } else {
            geofenceCircleRef.current.setCenter(gCenter);
            geofenceCircleRef.current.setRadius(geofence.radius);
            geofenceMarkerRef.current.setPosition(gCenter);
          }
        } else {
          if (geofenceCircleRef.current) {
            geofenceCircleRef.current.setMap(null);
            geofenceCircleRef.current = null;
          }
          if (geofenceMarkerRef.current) {
            geofenceMarkerRef.current.setMap(null);
            geofenceMarkerRef.current = null;
          }
        }
      })
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, accuracy, label, geofence?.lat, geofence?.lng, geofence?.radius]);

  return <div ref={ref} style={{ width: "100%", height, borderRadius: 12 }} />;
};
