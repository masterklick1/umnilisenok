import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Search, BookmarkPlus } from "lucide-react";
import {
  GEOFENCE_PRESETS,
  type GeofencePreset,
} from "@/lib/saved-places";
import { MyPlacePicker } from "@/components/parental/MyPlacePicker";
import {
  autocompletePlaces,
  getPlaceDetails,
  textSearchPlaces,
  type AutocompleteSuggestion,
  type PlaceSearchResult,
} from "@/lib/maps-client";

export interface SelectedPlacePayload {
  name: string;
  emoji: string;
  address: string;
  lat: number;
  lng: number;
  radius_m: number;
}

interface PlaceAddressSearchProps {
  childName: string;
  childLocation?: { lat: number; lng: number } | null;
  disabled?: boolean;
  detectingPlace?: boolean;
  onAutoDetectPlace: (preset: GeofencePreset) => void;
  onManualPlace: (lat: number, lng: number, name: string, preset: GeofencePreset | null) => void;
  onSelectPlace: (place: SelectedPlacePayload, save: boolean) => void;
  onManualCurrent: (preset: GeofencePreset) => void;
}

export const PlaceAddressSearch = ({
  childName,
  childLocation,
  disabled,
  detectingPlace,
  onAutoDetectPlace,
  onManualPlace,
  onSelectPlace,
  onManualCurrent,
}: PlaceAddressSearchProps) => {
  const [query, setQuery] = useState("");
  const [activePreset, setActivePreset] = useState<GeofencePreset | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autocomplete через Edge places-proxy (Places API New).
  // Работает одинаково в web и в Capacitor native — без browser-key.
  useEffect(() => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggesting(false);
      return;
    }
    setSuggesting(true);
    suggestTimerRef.current = setTimeout(async () => {
      const items = await autocompletePlaces(q, childLocation ?? undefined);
      setSuggestions(items.slice(0, 6));
      setSuggesting(false);
    }, 300);
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, [query, childLocation]);

  const runSearch = useCallback(
    async (searchQuery: string) => {
      const q = searchQuery.trim();
      if (!q) return;

      setSearching(true);
      setSearchError(null);
      setResults([]);
      setSuggestions([]);

      const found = await textSearchPlaces(q, childLocation ?? undefined);
      setSearching(false);

      if (!found.length) {
        setSearchError(
          "Адрес не найден. Попробуйте другой запрос или укажите вручную — где ребёнок сейчас.",
        );
        return;
      }

      setResults(found);
    },
    [childLocation],
  );

  const startPresetSearch = (preset: GeofencePreset) => {
    setActivePreset(preset);
    const searchText =
      preset.id === "kindergarten"
        ? "детский сад"
        : preset.id === "school"
          ? "школа"
          : preset.id === "home"
            ? "дом"
            : preset.id === "grandma"
              ? "дом"
              : preset.id === "activity"
                ? "детская секция"
                : "детская площадка";

    setQuery(searchText);
    runSearch(searchText);
  };

  const pickResult = (result: PlaceSearchResult, save: boolean) => {
    const preset = activePreset ?? {
      id: "custom",
      emoji: "📍",
      name: result.name,
      radius_m: 150,
      hint: "",
    };
    onSelectPlace(
      {
        name: preset.name === "Дом" && result.name ? result.name : preset.name,
        emoji: preset.emoji,
        address: result.address || result.name,
        lat: result.lat,
        lng: result.lng,
        radius_m: preset.radius_m,
      },
      save,
    );
    setResults([]);
    setSuggestions([]);
    setSearchError(null);
  };

  const pickSuggestion = async (s: AutocompleteSuggestion) => {
    setSuggestions([]);
    setSearching(true);
    const details = await getPlaceDetails(s.placeId);
    setSearching(false);
    if (!details) {
      setSearchError("Не удалось получить детали адреса.");
      return;
    }
    pickResult(details, true);
  };

  return (
    <div className="space-y-3">
      <MyPlacePicker
        childName={childName}
        activePreset={activePreset}
        disabled={disabled}
        detecting={detectingPlace}
        hasChildLocation={!!childLocation}
        onAutoDetect={() => onAutoDetectPlace(activePreset ?? GEOFENCE_PRESETS[2])}
        onManualSubmit={(lat, lng, name) => onManualPlace(lat, lng, name, activePreset)}
      />

      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Умный поиск места
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          Нажмите «Садик» или «Школа» — подберём адрес. Каждое сохранённое место запоминается
          навсегда: при входе и выходе придёт уведомление («в школе», «вышел», «идёт домой»).
          Радиус каждого места настраивается отдельно ниже.
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {GEOFENCE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant={activePreset?.id === preset.id ? "default" : "outline"}
            size="sm"
            className="text-xs h-auto py-2 px-1"
            disabled={disabled || searching}
            onClick={() => startPresetSearch(preset)}
          >
            {preset.emoji} {preset.name}
          </Button>
        ))}
      </div>

      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Адрес или название: Садик №5, ул. Ленина 10…"
              className="pl-9"
              disabled={disabled || searching}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(query);
              }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || searching || !query.trim()}
            onClick={() => runSearch(query)}
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Найти"}
          </Button>
        </div>

        {(suggesting || suggestions.length > 0) && !searching && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border bg-popover shadow-md overflow-hidden">
            {suggesting && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Поиск…
              </div>
            )}
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-accent transition text-xs border-b last:border-b-0"
                onClick={() => pickSuggestion(s)}
              >
                <p className="font-medium truncate">{s.mainText || s.text}</p>
                {s.secondaryText && (
                  <p className="text-muted-foreground truncate">{s.secondaryText}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Подсказки Google при вводе адреса работают через защищённый сервер — без ограничений
        браузера/устройства.
      </p>

      {searchError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs space-y-2">
          <p className="text-amber-900">{searchError}</p>
          <p className="text-amber-800">
            Не нашли? Нажмите «Определить автоматически» или «Вручную» выше — координаты с GPS или
            с карты Google.
          </p>
          {activePreset && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              disabled={disabled || !childLocation}
              onClick={() => onManualCurrent(activePreset)}
            >
              <MapPin className="w-4 h-4 mr-1" />
              Зона = где {childName} сейчас ({activePreset.emoji} {activePreset.name})
            </Button>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Выберите адрес из списка</Label>
          {results.map((r) => (
            <div
              key={r.placeId}
              className="flex items-start gap-2 p-2 rounded-lg border bg-card text-xs"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.name}</p>
                <p className="text-muted-foreground line-clamp-2">{r.address}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-[10px] px-2"
                  disabled={disabled}
                  onClick={() => pickResult(r, false)}
                >
                  Выбрать
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] px-2 gap-0.5"
                  disabled={disabled}
                  onClick={() => pickResult(r, true)}
                >
                  <BookmarkPlus className="w-3 h-3" />
                  Сохранить
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
