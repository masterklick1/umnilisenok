// Web-fallback: загрузка Maps JavaScript API для рендера карты в браузере
// (Lovable-preview, десктоп). В Capacitor native карта рендерится через
// @capacitor/google-maps — этот файл там не используется.
//
// Поиск мест и Autocomplete больше НЕ живут здесь — они переехали в
// src/lib/maps-client.ts (через Edge-функции places-proxy/directions-proxy),
// чтобы работать одинаково в web и native без referrer-restricted ключа.

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string;
const CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string;

declare global {
  interface Window {
    google: any;
    __initLovableMap?: () => void;
    __googleMapsLoading?: Promise<void>;
  }
}

export const isGoogleMapsConfigured = (): boolean =>
  Boolean(BROWSER_KEY?.trim());

export const loadGoogleMaps = (libraries: string[] = []): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__googleMapsLoading) return window.__googleMapsLoading;

  window.__googleMapsLoading = new Promise((resolve, reject) => {
    window.__initLovableMap = () => resolve();
    const libs = libraries.length ? `&libraries=${libraries.join(",")}` : "";
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}${libs}&loading=async&callback=__initLovableMap&channel=${CHANNEL}`;
    s.async = true;
    s.onerror = () => reject(new Error("Не удалось загрузить Google Maps"));
    document.head.appendChild(s);
  });

  return window.__googleMapsLoading;
};

// Backward-compat re-exports для старого кода, который импортировал searchPlaces
// напрямую из этого модуля.
export type { PlaceSearchResult as SearchPlaceResult } from "@/lib/maps-client";
export { textSearchPlaces as searchPlaces } from "@/lib/maps-client";
