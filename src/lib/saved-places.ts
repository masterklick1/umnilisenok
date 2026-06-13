export interface SavedPlace {
  id: string;
  name: string;
  emoji: string;
  lat: number;
  lng: number;
  radius_m: number;
}

export interface GeofencePreset {
  id: string;
  emoji: string;
  name: string;
  radius_m: number;
  hint: string;
}

export const GEOFENCE_PRESETS: GeofencePreset[] = [
  { id: "kindergarten", emoji: "🧸", name: "Садик", radius_m: 150, hint: "150 м — детский сад" },
  { id: "school", emoji: "🏫", name: "Школа", radius_m: 200, hint: "200 м — школа" },
  { id: "home", emoji: "🏠", name: "Дом", radius_m: 120, hint: "120 м — дом" },
  { id: "grandma", emoji: "👵", name: "Бабушка", radius_m: 100, hint: "100 м — гости" },
  { id: "activity", emoji: "⚽", name: "Секция", radius_m: 150, hint: "150 м — кружок" },
  { id: "park", emoji: "🌳", name: "Площадка", radius_m: 100, hint: "100 м — двор/парк" },
];

const placesKey = (childId: string) => `parent_saved_places_${childId}`;
const labelKey = (childId: string) => `parent_geofence_label_${childId}`;

export const loadSavedPlaces = (childId: string): SavedPlace[] => {
  try {
    const raw = localStorage.getItem(placesKey(childId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPlace[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const persistSavedPlaces = (childId: string, places: SavedPlace[]) => {
  localStorage.setItem(placesKey(childId), JSON.stringify(places));
};

export const loadGeofenceLabel = (childId: string): string | null => {
  return localStorage.getItem(labelKey(childId));
};

export const persistGeofenceLabel = (childId: string, label: string | null) => {
  if (label) localStorage.setItem(labelKey(childId), label);
  else localStorage.removeItem(labelKey(childId));
};

export const upsertSavedPlace = (childId: string, place: SavedPlace): SavedPlace[] => {
  const existing = loadSavedPlaces(childId);
  const idx = existing.findIndex((p) => p.id === place.id);
  const next = [...existing];
  if (idx >= 0) next[idx] = place;
  else next.unshift(place);
  persistSavedPlaces(childId, next.slice(0, 12));
  return next.slice(0, 12);
};

export const removeSavedPlace = (childId: string, placeId: string): SavedPlace[] => {
  const next = loadSavedPlaces(childId).filter((p) => p.id !== placeId);
  persistSavedPlaces(childId, next);
  return next;
};

export const presetById = (id: string) => GEOFENCE_PRESETS.find((p) => p.id === id);

export const formatPlaceLabel = (emoji: string, name: string) => `${emoji} ${name}`;
