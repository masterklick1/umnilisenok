import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
  const [showManual, setShowManual] = useState(false);
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const defaultName = activePreset?.name ?? t("Моё место", "My location");

  const submitManual = () => {
    const lat = parseFloat(latInput.replace(",", "."));
    const lng = parseFloat(lngInput.replace(",", "."));
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setManualError(t("Укажите широту от -90 до 90 (например 55.751244)", "Enter a latitude from -90 to 90, such as 55.751244"));
      return;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setManualError(t("Укажите долготу от -180 до 180 (например 37.618423)", "Enter a longitude from -180 to 180, such as 37.618423"));
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
          {t("Моё место", "My location")}
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          {activePreset
            ? t(`Авто или вручную — куда поставить «${activePreset.emoji} ${activePreset.name}»`, `Set the location for ${activePreset.emoji} ${activePreset.name}`)
            : t("Сначала нажмите Садик, Школа или Дом — или укажите координаты вручную", "Choose Preschool, School or Home, or enter coordinates")}
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
          {t("Определить автоматически", "Find automatically")}
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
          {showManual ? t("Скрыть", "Hide") : t("Вручную", "Enter manually")}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {t("Авто: сначала ваш GPS, если не получилось — где", "Automatic location checks your GPS first, then the latest location for")} {childName} {t("сейчас", "now")}
        {hasChildLocation ? t(" (есть координаты)", " (location available)") : t(" (ждём координаты ребёнка)", " (waiting for their location)")}{t(". Не нашли адрес в поиске — укажите координаты или нажмите на карту ниже.", ". If search can’t find the address, enter coordinates or tap on the map.")}
      </p>

      {showManual && (
        <div className="space-y-2 pt-2 border-t border-primary/10">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="manual-lat" className="text-xs">
                {t("Широта", "Latitude")}
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
                {t("Долгота", "Longitude")}
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
              {t("Название", "Name")}
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
            {t("Поставить зону вручную", "Set the zone manually")}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            {t("Координаты можно скопировать из Google Maps: нажмите на точку → «55.123, 37.456»", "To copy coordinates from Google Maps, select a point and copy the numbers, such as 55.123, 37.456.")}
          </p>
        </div>
      )}
    </div>
  );
};
