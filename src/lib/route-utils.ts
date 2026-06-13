export interface LatLng {
  lat: number;
  lng: number;
}

export type TravelMode = "driving" | "walking";

const toRad = (d: number) => (d * Math.PI) / 180;

/** Distance in meters between two points */
export const distanceMeters = (a: LatLng, b: LatLng): number => {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(1)} км`;
};

export const googleMapsDirectionsUrl = (
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode = "driving",
): string => {
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: mode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const googleMapsPointUrl = (point: LatLng): string =>
  `https://www.google.com/maps?q=${point.lat},${point.lng}`;

export const getParentLocation = (): Promise<LatLng> =>
  new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Геолокация недоступна в браузере"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
