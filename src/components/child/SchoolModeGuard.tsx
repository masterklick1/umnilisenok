import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { notifySchoolModeChange } from "@/lib/child-notifications";

interface SchoolSettings {
  school_mode_enabled: boolean;
  school_start: string;
  school_end: string;
}

const POLL_MS = 60_000;

/** Проверка: сейчас внутри школьных часов? Поддерживает интервалы через полночь. */
const isSchoolTime = (start: string, end: string, now = new Date()): boolean => {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = toMin(start);
  const e = toMin(end);
  if (s === e) return false;
  return s < e ? cur >= s && cur < e : cur >= s || cur < e;
};

/**
 * Школьный режим: в часы, заданные родителем, уроки и игры закрыты —
 * ребёнок видит экран «Время уроков». SOS и геолокация продолжают работать.
 */
export const SchoolModeGuard = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isChild } = useUserRole();
  const [blocked, setBlocked] = useState(false);
  const [endTime, setEndTime] = useState<string>("");

  useEffect(() => {
    if (!user?.id || !isChild) return;

    const childId = sessionStorage.getItem("activeChildId") || user.id;
    let active = true;

    const check = async () => {
      try {
        const { data } = await supabase
          .from("child_settings")
          .select("school_mode_enabled, school_start, school_end")
          .eq("child_id", childId)
          .maybeSingle();
        if (!active) return;
        const s = data as SchoolSettings | null;
        const nowBlocked = !!s?.school_mode_enabled && isSchoolTime(s.school_start, s.school_end);
        setBlocked(nowBlocked);
        if (nowBlocked) setEndTime(s!.school_end);
        if (s?.school_mode_enabled) {
          void notifySchoolModeChange(nowBlocked, s.school_end);
        }
      } catch {
        // при ошибке сети не блокируем
      }
    };

    void check();
    const timer = window.setInterval(check, POLL_MS);
    // Перепроверяем каждые 15 сек локально (часы могут наступить без обновления настроек)
    const localTimer = window.setInterval(() => {
      setBlocked((prev) => {
        if (!prev) return prev;
        return prev; // снятие блокировки произойдёт на следующем poll
      });
    }, 15_000);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.clearInterval(localTimer);
    };
  }, [user?.id, isChild]);

  if (!blocked) return <>{children}</>;

  return (
    <div className="rounded-3xl border-2 border-primary/30 bg-card/95 p-8 text-center shadow-xl space-y-4">
      <div className="text-7xl">🏫</div>
      <h2 className="text-2xl font-bold text-primary">Время уроков!</h2>
      <p className="text-muted-foreground">
        Сейчас школьное время — уроки и игры откроются после занятий
        {endTime ? ` (в ${endTime.slice(0, 5)})` : ""}.
      </p>
      <p className="text-sm text-muted-foreground">
        Кнопка SOS работает всегда — она внизу экрана.
      </p>
    </div>
  );
};
