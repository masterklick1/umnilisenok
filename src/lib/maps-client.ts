// Единая клиентская обёртка поверх Edge-функций places-proxy / directions-proxy.
// Работает и в браузере, и в Capacitor native — никакого браузерного ключа не требует.

import { supabase } from "@/integrations/supabase/client";
import type { LatLng, TravelMode } from "@/lib/route-utils";

export interface AutocompleteSuggestion {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface DirectionsResult {
  path: LatLng[];
  distanceMeters: number | null;
  duration: string | null;
}

const invoke = async <T>(fn: string, body: unknown): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<T>(fn, { body });
  if (error) throw error;
  if (!data) throw new Error(`${fn}: empty response`);
  return data;
};

export const autocompletePlaces = async (
  input: string,
  near?: LatLng,
  sessionToken?: string,
): Promise<AutocompleteSuggestion[]> => {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];
  try {
    const data = await invoke<{ suggestions: AutocompleteSuggestion[] }>(
      "places-proxy",
      { action: "autocomplete", input: trimmed, location: near, sessionToken },
    );
    return data.suggestions ?? [];
  } catch (e) {
    console.warn("autocompletePlaces failed", e);
    return [];
  }
};

export const textSearchPlaces = async (
  input: string,
  near?: LatLng,
): Promise<PlaceSearchResult[]> => {
  const trimmed = input.trim();
  if (trimmed.length < 2) return [];
  try {
    const data = await invoke<{ results: PlaceSearchResult[] }>(
      "places-proxy",
      { action: "textsearch", input: trimmed, location: near },
    );
    return data.results ?? [];
  } catch (e) {
    console.warn("textSearchPlaces failed", e);
    return [];
  }
};

export const getPlaceDetails = async (
  placeId: string,
): Promise<PlaceSearchResult | null> => {
  try {
    return await invoke<PlaceSearchResult>("places-proxy", {
      action: "details",
      placeId,
    });
  } catch (e) {
    console.warn("getPlaceDetails failed", e);
    return null;
  }
};

export const getDirections = async (
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode = "driving",
): Promise<DirectionsResult | null> => {
  try {
    return await invoke<DirectionsResult>("directions-proxy", {
      origin,
      destination,
      mode,
    });
  } catch (e) {
    console.warn("getDirections failed", e);
    return null;
  }
};
