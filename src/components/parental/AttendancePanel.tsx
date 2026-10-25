import { StreakBonusCard } from "./StreakBonusCard";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Row = { created_at: string };
const DAYS = 28;
const SESSION_GAP_MS = 30 * 60 * 1000;

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtTime = (d: Date) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d: Date) => d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });

/** Посещаемость: когда ребёнок открывал приложение и сколько занимался по дням. */
export const AttendancePanel = ({ childId, childName }: { childId: string; childName: string }) => {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let active = true;
    const since = new Date(Date.now() - DAYS * 86400000).toISOString();
    const load = async () => {
      const { data } = await supabase
        .from("child_activity")
        .select("created_at")
        .eq("child_id", childId)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(5000);
      if (active) setRows(data ?? []);
    };
    load();
    const ch = supabase
      .channel(`attendance-${childId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "child_activity", filter: `child_id=eq.${childId}` }, load)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [childId]);

  // Сессии: новая сессия, если перерыв больше 30 минут
  const sessions = useMemo(() => {
    const list: { start: Date; end: Date }[] = [];
    (rows ?? []).forEach((r) => {
      const t = new Date(r.created_at);
      const last = list[list.length - 1];
      if (last && t.getTime() - last.end.getTime() < SESSION_GAP_MS) last.end = t;
      else list.push({ start: t, end: t });
    });
    return list.reverse();
  }, [rows]);

  const byDay = useMemo(() => {
    const map = new Map<string, { count: number; minutes: number }>();
    sessions.forEach((s) => {
      const k = dayKey(s.start);
      const cur = map.get(k) ?? { count: 0, minutes: 0 };
      cur.count += 1;
      cur.minutes += Math.max(1, Math.round((s.end.getTime() - s.start.getTime()) / 60000));
      map.set(k, cur);
    });
    return map;
  }, [sessions]);

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    return d;
  });
  const activeDays = days.filter((d) => byDay.has(dayKey(d))).length;

  if (!rows) return <p className="text-sm text-muted-foreground text-center py-8">Загрузка…</p>;

  return (
    <div className="space-y-4">
      <StreakBonusCard childId={childId} />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📅 Посещаемость за 4 недели</CardTitle>
          <p className="text-sm text-muted-foreground">
            {childName} занимался {activeDays} из {DAYS} дней
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((w) => (
              <div key={w} className="text-[10px] text-center text-muted-foreground">{w}</div>
            ))}
            {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => <div key={`e${i}`} />)}
            {days.map((d) => {
              const info = byDay.get(dayKey(d));
              const level = !info ? "bg-muted" : info.minutes >= 30 ? "bg-primary" : info.minutes >= 10 ? "bg-primary/70" : "bg-primary/40";
              return (
                <div
                  key={dayKey(d)}
                  className={`aspect-square rounded-md ${level} flex items-center justify-center text-[10px] font-medium`}
                  title={info ? `${fmtDate(d)}: ${info.count} вход(ов), ~${info.minutes} мин` : `${fmtDate(d)}: не заходил`}
                >
                  {d.getDate()}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Чем ярче день — тем дольше занимался.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🕒 Когда открывал приложение</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">За последние 4 недели входов не было.</p>
          ) : (
            sessions.slice(0, 40).map((s) => {
              const mins = Math.max(1, Math.round((s.end.getTime() - s.start.getTime()) / 60000));
              return (
                <div key={s.start.toISOString()} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                  <span className="font-medium capitalize">{fmtDate(s.start)}</span>
                  <span className="text-muted-foreground">
                    {fmtTime(s.start)}–{fmtTime(s.end)} · {mins} мин
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};
