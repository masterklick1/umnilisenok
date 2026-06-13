import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Navigation, Pencil } from "lucide-react";
import type { GeofencePreset } from "@/lib/saved-places";

interface MyPlacePickerProps {
  childName: string;
  activePreset: GeofencePreset | null;
  disabled?: boolean;
  detecting?: boolean;
  hasChildLocation?: boolean;
  onAutoDetect: () => void;
  onManualSubmit: (lat: number, lng: number, name: string) => void;
}

export const MyPlacePicker = ({
  childName,
  activePreset,
  disabled,
  detecting,
  hasChildLocation,
  onAutoDetect,
  onManualSubmit,
}: MyPlacePickerProps) => {
  const [showManual, setShowManual] = useState(false);
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const defaultName = activePreset?.name ?? "Моё место";

  const submitManual = () => {
    const lat = parseFloat(latInput.replace(",", "."));
    const lng = parseFloat(lngInput.replace(",", "."));
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setManualError("Укажите широту от -90 до 90 (например 55.751244)");
      return;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setManualError("Укажите долготу от -180 до 180 (например 37.618423)");
      return;
    }
    setManualError(null);
    onManualSubmit(lat, lng, nameInput.trim() || defaultName);
    setLatInput("");
    setLngInput("");
    setNameInput("");
    setShowManual(false);
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary" />
          Моё место
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          {activePreset
            ? `Авто или вручную — куда поставить «${activePreset.emoji} ${activePreset.name}»`
            : "Сначала нажмите Садик, Школа или Дом — или укажите координаты вручную"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled || detecting}
          onClick={onAutoDetect}
          className="gap-1"
        >
          {detecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          Определить автоматически
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => setShowManual((v) => !v)}
          className="gap-1"
        >
          <Pencil className="w-4 h-4" />
          {showManual ? "Скрыть" : "Вручную"}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Авто: сначала ваш GPS, если не получилось — где {childName} сейчас
        {hasChildLocation ? " (есть координаты)" : " (ждём координаты ребёнка)"}.
        Не нашли адрес в поиске — укажите координаты или нажмите на карту ниже.
      </p>

      {showManual && (
        <div className="space-y-2 pt-2 border-t border-primary/10">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="manual-lat" className="text-xs">
                Широта
              </Label>
              <Input
                id="manual-lat"
                inputMode="decimal"
                placeholder="55.751244"
                value={latInput}
                onChange={(e) => {
                  setLatInput(e.target.value);
                  setManualError(null);
                }}
                disabled={disabled}
                className="h-9 text-sm font-mono"
              />
            </div>
            <div>
              <Label htmlFor="manual-lng" className="text-xs">
                Долгота
              </Label>
              <Input
                id="manual-lng"
                inputMode="decimal"
                placeholder="37.618423"
                value={lngInput}
                onChange={(e) => {
                  setLngInput(e.target.value);
                  setManualError(null);
                }}
                disabled={disabled}
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="manual-name" className="text-xs">
              Название
            </Label>
            <Input
              id="manual-name"
              placeholder={defaultName}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              disabled={disabled}
              className="h-9 text-sm"
            />
          </div>
          {manualError && <p className="text-xs text-destructive">{manualError}</p>}
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={disabled || !latInput.trim() || !lngInput.trim()}
            onClick={submitManual}
          >
            Поставить зону вручную
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Координаты можно скопировать из Google Maps: нажмите на точку → «55.123, 37.456»
          </p>
        </div>
      )}
    </div>
  );
};
