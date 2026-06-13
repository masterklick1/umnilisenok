import type { LatLng } from "@/lib/route-utils";

const key = (userId: string) => `parent_manual_location_${userId}`;

export interface StoredParentLocation extends LatLng {
  savedAt: string;
  source: "manual" | "gps";
}

export const loadParentManualLocation = (userId: string): StoredParentLocation | null => {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredParentLocation;
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      !Number.isNaN(parsed.lat) &&
      !Number.isNaN(parsed.lng)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
};

export const saveParentManualLocation = (
  userId: string,
  loc: LatLng,
  source: "manual" | "gps" = "manual",
): StoredParentLocation => {
  const stored: StoredParentLocation = {
    lat: loc.lat,
    lng: loc.lng,
    savedAt: new Date().toISOString(),
    source,
  };
  localStorage.setItem(key(userId), JSON.stringify(stored));
  return stored;
};

export const clearParentManualLocation = (userId: string) => {
  localStorage.removeItem(key(userId));
};
