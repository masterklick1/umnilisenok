import { useEffect, useRef } from "react";

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string;
const CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string;

declare global {
  interface Window {
    google: any;
    __initLovableMap?: () => void;
    __googleMapsLoading?: Promise<void>;
  }
}

const loadGoogleMaps = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__googleMapsLoading) return window.__googleMapsLoading;

  window.__googleMapsLoading = new Promise((resolve, reject) => {
    window.__initLovableMap = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__initLovableMap&channel=${CHANNEL}`;
    s.async = true;
    s.onerror = () => reject(new Error("Не удалось загрузить Google Maps"));
    document.head.appendChild(s);
  });

  return window.__googleMapsLoading;
};

interface Props {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  label?: string;
  height?: number;
}

export const LocationMap = ({ latitude, longitude, accuracy, label, height = 280 }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

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
        } else {
          mapRef.current.panTo(center);
          markerRef.current.setPosition(center);
          if (circleRef.current) {
            circleRef.current.setCenter(center);
            if (accuracy) circleRef.current.setRadius(accuracy);
          }
        }
      })
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, accuracy, label]);

  return <div ref={ref} style={{ width: "100%", height, borderRadius: 12 }} />;
};
