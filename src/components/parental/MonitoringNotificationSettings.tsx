import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bell, Camera, Mic, MapPin } from "lucide-react";

export type MonitoringNotifPrefs = {
  photo: boolean;
  audio: boolean;
  location: boolean;
  level: "errors" | "all";
  timeoutMinutes: number; // 0 = disabled
};

const STORAGE_KEY = "monitoring_notif_prefs";

export const defaultPrefs: MonitoringNotifPrefs = {
  photo: true,
  audio: true,
  location: true,
  level: "all",
  timeoutMinutes: 5,
};

export const TIMEOUT_OPTIONS = [0, 2, 5, 10, 15, 30] as const;

export function loadMonitoringPrefs(): MonitoringNotifPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;
    return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    return defaultPrefs;
  }
}

export function shouldNotify(prefs: MonitoringNotifPrefs, type: string, status: string): boolean {
  if (type === "photo" && !prefs.photo) return false;
  if (type === "audio" && !prefs.audio) return false;
  if (type === "location" && !prefs.location) return false;
  if (prefs.level === "errors" && status !== "failed") return false;
  return true;
}

export function MonitoringNotificationSettings() {
  const [prefs, setPrefs] = useState<MonitoringNotifPrefs>(defaultPrefs);

  useEffect(() => {
    setPrefs(loadMonitoringPrefs());
  }, []);

  const update = (patch: Partial<MonitoringNotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("monitoring-prefs-changed", { detail: next }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-4 h-4" /> Уведомления о мониторинге
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-photo" className="flex items-center gap-2 cursor-pointer">
              <Camera className="w-4 h-4 text-muted-foreground" /> Фото
            </Label>
            <Switch
              id="notif-photo"
              checked={prefs.photo}
              onCheckedChange={(v) => update({ photo: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-audio" className="flex items-center gap-2 cursor-pointer">
              <Mic className="w-4 h-4 text-muted-foreground" /> Звук
            </Label>
            <Switch
              id="notif-audio"
              checked={prefs.audio}
              onCheckedChange={(v) => update({ audio: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-location" className="flex items-center gap-2 cursor-pointer">
              <MapPin className="w-4 h-4 text-muted-foreground" /> Локация
            </Label>
            <Switch
              id="notif-location"
              checked={prefs.location}
              onCheckedChange={(v) => update({ location: v })}
            />
          </div>
        </div>

        <div className="pt-3 border-t">
          <Label className="text-sm mb-2 block">Уровень уведомлений</Label>
          <RadioGroup
            value={prefs.level}
            onValueChange={(v) => update({ level: v as "errors" | "all" })}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="lvl-all" />
              <Label htmlFor="lvl-all" className="cursor-pointer font-normal">
                Все события (успех и ошибки)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="errors" id="lvl-errors" />
              <Label htmlFor="lvl-errors" className="cursor-pointer font-normal">
                Только ошибки
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="pt-3 border-t">
          <Label htmlFor="timeout-select" className="text-sm mb-2 block">
            Уведомить, если нет ответа от ребёнка
          </Label>
          <select
            id="timeout-select"
            value={prefs.timeoutMinutes}
            onChange={(e) => update({ timeoutMinutes: Number(e.target.value) })}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {TIMEOUT_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m === 0 ? "Отключено" : `Через ${m} мин`}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Если запрос остаётся в статусе «ожидание» дольше указанного времени, придёт уведомление.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
