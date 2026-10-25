import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Watch } from "lucide-react";
import { WATCH_MODE_KEY, getWatchModeSetting } from "@/hooks/useIsWatch";

const OPTIONS = [
  { value: "auto", label: "Авто", hint: "само на маленьком экране" },
  { value: "on", label: "Вкл", hint: "всегда как на часах" },
  { value: "off", label: "Выкл", hint: "обычное меню" },
];

/**
 * Переключатель «режима часов»: на детских часах вместо уроков и игр
 * показываются только часы, большая кнопка SOS и статус «где я».
 */
export const WatchModeSettings = () => {
  const [mode, setMode] = useState("auto");

  useEffect(() => {
    setMode(getWatchModeSetting());
  }, []);

  const change = (value: string) => {
    setMode(value);
    try {
      localStorage.setItem(WATCH_MODE_KEY, value);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event("watch-mode-changed"));
  };

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center gap-2 font-semibold mb-1">
        <Watch className="w-5 h-5 text-primary" /> Режим часов
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Для детских часов: только время, большая кнопка SOS и статус «где я» — без уроков и игр.
        Геолокация и геозоны продолжают работать.
      </p>
      <div className="flex gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => change(o.value)}
            className={`flex-1 rounded-xl border px-2 py-2 text-center transition-colors ${
              mode === o.value
                ? "border-primary bg-primary/10 font-semibold"
                : "border-border bg-card"
            }`}
          >
            <div className="text-sm">{o.label}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{o.hint}</div>
          </button>
        ))}
      </div>
    </Card>
  );
};
