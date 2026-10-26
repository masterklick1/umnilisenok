import { useEffect, useState } from "react";

export const WATCH_MODE_KEY = "watch-mode"; // "on" | "off" | "auto" (по умолчанию auto)

export const getWatchModeSetting = (): string => {
  try {
    return localStorage.getItem(WATCH_MODE_KEY) || "auto";
  } catch {
    return "auto";
  }
};

/**
 * Определяет «часовой» режим:
 * - "on"  — всегда компактный экран защиты (выбрано в настройках);
 * - "off" — никогда;
 * - "auto" — по ширине экрана (только часы: ≤320×480px, телефоны не попадают).
 */
export const useIsWatch = () => {
  const [isWatch, setIsWatch] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 320px) and (max-height: 480px)");
    const update = () => {
      const mode = getWatchModeSetting();
      setIsWatch(mode === "on" ? true : mode === "off" ? false : mq.matches);
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("watch-mode-changed", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("watch-mode-changed", update);
    };
  }, []);

  return isWatch;
};
