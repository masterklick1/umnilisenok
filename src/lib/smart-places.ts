import type { SavedPlace } from "@/lib/saved-places";

export type PlaceEventType = "enter" | "exit";
export type ChildMovementStatus = "at_place" | "left_place" | "going_to" | "traveling" | "unknown";

export interface DbSavedPlace {
  id: string;
  child_id: string;
  place_key: string;
  name: string;
  emoji: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_m: number;
  notify_enabled: boolean;
}

export interface PlaceTransition {
  place: DbSavedPlace;
  eventType: PlaceEventType;
  distance_m: number;
}

export interface SmartStatusResult {
  status: ChildMovementStatus;
  statusMessage: string;
  currentPlace: DbSavedPlace | null;
  targetPlace: DbSavedPlace | null;
  transitions: PlaceTransition[];
}

const distanceM = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const findHome = (places: DbSavedPlace[]) =>
  places.find((p) => p.place_key === "home" || p.name.toLowerCase().includes("дом"));

export const dbPlaceToSaved = (p: DbSavedPlace): SavedPlace => ({
  id: p.place_key,
  name: p.name,
  emoji: p.emoji,
  lat: p.latitude,
  lng: p.longitude,
  radius_m: p.radius_m,
});

export const evaluateSmartPlaces = (
  lat: number,
  lng: number,
  places: DbSavedPlace[],
  insideMap: Map<string, boolean>,
): SmartStatusResult => {
  const enabled = places.filter((p) => p.notify_enabled);
  const transitions: PlaceTransition[] = [];
  let currentPlace: DbSavedPlace | null = null;

  for (const place of enabled) {
    const d = distanceM(lat, lng, place.latitude, place.longitude);
    const inside = d <= place.radius_m;
    const prev = insideMap.get(place.id);

    if (prev === undefined) {
      insideMap.set(place.id, inside);
      if (inside) currentPlace = place;
      continue;
    }

    if (prev !== inside) {
      insideMap.set(place.id, inside);
      transitions.push({
        place,
        eventType: inside ? "enter" : "exit",
        distance_m: d,
      });
    }

    if (inside) currentPlace = place;
  }

  const home = findHome(enabled);
  let status: ChildMovementStatus = "unknown";
  let statusMessage = "📍 В пути";
  let targetPlace: DbSavedPlace | null = null;

  if (currentPlace) {
    status = "at_place";
    statusMessage = `${currentPlace.emoji} В ${currentPlace.name}`;
  } else {
    const lastExit = transitions.find((t) => t.eventType === "exit");
    if (lastExit) {
      status = "left_place";
      statusMessage = `${lastExit.place.emoji} Вышел из «${lastExit.place.name}»`;
      if (home && lastExit.place.id !== home.id) {
        status = "going_to";
        targetPlace = home;
        statusMessage = `${home.emoji} Идёт домой`;
      }
    } else if (home && distanceM(lat, lng, home.latitude, home.longitude) > home.radius_m) {
      const distHome = distanceM(lat, lng, home.latitude, home.longitude);
      if (distHome < 2000) {
        status = "going_to";
        targetPlace = home;
        statusMessage = `${home.emoji} Идёт домой`;
      } else {
        status = "traveling";
        statusMessage = "🚶 В пути";
      }
    }
  }

  return { status, statusMessage, currentPlace, targetPlace, transitions };
};

export const eventTitle = (t: PlaceTransition, childName: string) => {
  if (t.eventType === "enter") {
    return `✅ ${childName} в ${t.place.name}`;
  }
  return `⚠️ ${childName} вышел из «${t.place.name}»`;
};

export { distanceM };
