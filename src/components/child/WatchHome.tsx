import { useEffect, useState } from "react";
import { SOSButton } from "@/components/SOSButton";
import type { LocationTrackerStatus } from "@/hooks/useLocationTracker";

const WEEKDAYS = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/**
 * Компактный экран для детских часов (Wear / Android-часы).
 * Только защита: красивые часы, большая кнопка SOS и статус «где я».
 * Уроки и игры на часах не показываются — родитель следит из своего кабинета.
 */
export const WatchHome = ({ childName }: { childName: string }) => {
  const [status, setStatus] = useState<LocationTrackerStatus | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const onStatus = (e: Event) => {
      setStatus((e as CustomEvent<LocationTrackerStatus>).detail);
    };
    window.addEventListener("location-tracker-status", onStatus);
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.removeEventListener("location-tracker-status", onStatus);
      window.clearInterval(clock);
    };
  }, []);

  const lastSent = status?.lastSentAt ? new Date(status.lastSentAt) : null;
  const trackingOk = !!lastSent && !status?.lastError;

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateLine = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-primary/20 text-white flex flex-col items-center justify-between py-5 px-3 select-none overflow-hidden">
      {/* Красивые часы */}
      <div className="text-center mt-2">
        <div className="flex items-baseline justify-center gap-1 tabular-nums">
          <span className="text-6xl font-extrabold tracking-tight bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300 bg-clip-text text-transparent drop-shadow">
            {hh}:{mm}
          </span>
          <span className="text-lg font-semibold text-white/50">{ss}</span>
        </div>
        <div className="text-xs text-white/60 mt-1 tracking-wide">{dateLine}</div>
        {childName && (
          <div className="text-[11px] text-white/40 mt-0.5">🦊 {childName}</div>
        )}
      </div>

      {/* Статус защиты */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative">
          <div
            className={`w-3.5 h-3.5 rounded-full ${trackingOk ? "bg-emerald-400" : "bg-amber-400"}`}
          />
          <div
            className={`absolute inset-0 rounded-full ${trackingOk ? "bg-emerald-400" : "bg-amber-400"} animate-ping opacity-60`}
          />
        </div>
        <div className="text-[11px] text-white/70 text-center leading-tight max-w-[200px]">
          {trackingOk
            ? `Защита включена · «где я» отправлено в ${lastSent!.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
            : "Ищем местоположение…"}
        </div>
      </div>

      {/* Большой SOS по центру */}
      <div className="flex flex-col items-center gap-2 pb-2">
        <SOSButton big />
        <div className="text-[11px] text-white/50">Красная кнопка — позвать родителей</div>
        <button
          type="button"
          onClick={() => {
            try { localStorage.setItem("watch-mode", "off"); } catch { /* ignore */ }
            window.dispatchEvent(new Event("watch-mode-changed"));
          }}
          className="mt-1 rounded-full border border-white/30 px-3 py-1 text-[11px] text-white/80"
        >
          Уроки и игры
        </button>
      </div>
    </div>
  );
};
