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

export const loadGoogleMaps = (libraries: string[] = ["places"]): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places || (window.google?.maps && libraries.length === 0)) {
    return Promise.resolve();
  }
  if (window.google?.maps && libraries.includes("places") && !window.google.maps.places) {
    // Maps loaded without places — reload with places library
    window.__googleMapsLoading = undefined;
  }
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

export interface SearchPlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: "google" | "osm";
}

export const searchPlacesGoogle = async (
  query: string,
  near?: { lat: number; lng: number },
): Promise<SearchPlaceResult[]> => {
  await loadGoogleMaps(["places"]);
  const google = window.google;
  if (!google?.maps?.places) return [];

  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(document.createElement("div"));
    const request: Record<string, unknown> = { query };
    if (near) {
      request.location = new google.maps.LatLng(near.lat, near.lng);
      request.radius = 20000;
    }

    service.textSearch(request, (results: any[] | null, status: string) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
        resolve([]);
        return;
      }
      resolve(
        results.slice(0, 6).map((r) => ({
          id: r.place_id || `${r.geometry.location.lat()}-${r.geometry.location.lng()}`,
          name: r.name || query,
          address: r.formatted_address || r.vicinity || "",
          lat: r.geometry.location.lat(),
          lng: r.geometry.location.lng(),
          source: "google" as const,
        })),
      );
    });
  });
};

export const searchPlacesOsm = async (query: string): Promise<SearchPlaceResult[]> => {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "ru");
    url.searchParams.set("accept-language", "ru");

    const res = await fetch(url.toString(), {
      headers: { "Accept-Language": "ru" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      name?: string;
    }>;
    return data.map((row) => ({
      id: String(row.place_id),
      name: row.name || query,
      address: row.display_name,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lon),
      source: "osm" as const,
    }));
  } catch {
    return [];
  }
};

export const searchPlaces = async (
  query: string,
  near?: { lat: number; lng: number },
): Promise<SearchPlaceResult[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (isGoogleMapsConfigured()) {
    const googleResults = await searchPlacesGoogle(trimmed, near);
    if (googleResults.length) return googleResults;
  }

  return searchPlacesOsm(trimmed);
};
