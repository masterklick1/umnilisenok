import { supabase } from "@/integrations/supabase/client";
import type { SavedPlace } from "@/lib/saved-places";
import { loadSavedPlaces, persistSavedPlaces } from "@/lib/saved-places";
import type { DbSavedPlace } from "@/lib/smart-places";

export interface ChildPlaceStatusRow {
  child_id: string;
  current_place_id: string | null;
  current_place_name: string | null;
  status: string;
  target_place_id: string | null;
  target_place_name: string | null;
  status_message: string;
  latitude: number | null;
  longitude: number | null;
  updated_at: string;
}

export const fetchSavedPlaces = async (childId: string): Promise<DbSavedPlace[]> => {
  const { data, error } = await supabase
    .from("child_saved_places")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("fetchSavedPlaces:", error.message);
    return migrateLocalPlacesToMemory(childId);
  }

  const rows = (data || []) as DbSavedPlace[];
  if (rows.length === 0) {
    const local = loadSavedPlaces(childId);
    if (local.length > 0) {
      await Promise.all(local.map((p) => upsertSavedPlaceDb(childId, p)));
      return fetchSavedPlaces(childId);
    }
  }
  return rows;
};

const migrateLocalPlacesToMemory = (childId: string): DbSavedPlace[] => {
  return loadSavedPlaces(childId).map((p) => ({
    id: p.id,
    child_id: childId,
    place_key: p.id,
    name: p.name,
    emoji: p.emoji,
    address: null,
    latitude: p.lat,
    longitude: p.lng,
    radius_m: p.radius_m,
    notify_enabled: true,
  }));
};

export const upsertSavedPlaceDb = async (
  childId: string,
  place: SavedPlace & { address?: string },
): Promise<DbSavedPlace | null> => {
  const payload = {
    child_id: childId,
    place_key: place.id,
    name: place.name,
    emoji: place.emoji,
    address: place.address ?? null,
    latitude: place.lat,
    longitude: place.lng,
    radius_m: place.radius_m,
    notify_enabled: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("child_saved_places")
    .upsert(payload, { onConflict: "child_id,place_key" })
    .select("*")
    .maybeSingle();

  if (error) {
    console.warn("upsertSavedPlaceDb:", error.message);
    return null;
  }

  const local = loadSavedPlaces(childId);
  const idx = local.findIndex((p) => p.id === place.id);
  const next = [...local];
  if (idx >= 0) next[idx] = place;
  else next.unshift(place);
  persistSavedPlaces(childId, next.slice(0, 12));

  return data as DbSavedPlace;
};

export const updatePlaceRadiusDb = async (placeId: string, radius_m: number) => {
  await supabase
    .from("child_saved_places")
    .update({ radius_m, updated_at: new Date().toISOString() })
    .eq("id", placeId);
};

export const deleteSavedPlaceDb = async (childId: string, placeKey: string) => {
  await supabase
    .from("child_saved_places")
    .delete()
    .eq("child_id", childId)
    .eq("place_key", placeKey);
};

export const fetchPlaceStatus = async (childId: string): Promise<ChildPlaceStatusRow | null> => {
  const { data } = await (supabase as any)
    .from("child_place_status")
    .select("*")
    .eq("child_id", childId)
    .maybeSingle();
  return (data as unknown as ChildPlaceStatusRow) || null;
};

export const upsertPlaceStatus = async (
  childId: string,
  patch: Partial<Omit<ChildPlaceStatusRow, "child_id">>,
) => {
  await (supabase as any).from("child_place_status").upsert(
    {
      child_id: childId,
      updated_at: new Date().toISOString(),
      ...patch,
    },
    { onConflict: "child_id" },
  );
};

export const emitChildPlaceStatus = (message: string) => {
  window.dispatchEvent(new CustomEvent("child-place-status", { detail: { message } }));
};
