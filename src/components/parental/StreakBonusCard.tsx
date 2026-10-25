import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Row = { bonus_day: string; streak: number; stars: number };

/** Бонусы за дни подряд — для родителя, обновляется в реальном времени. */
export const StreakBonusCard = ({ childId }: { childId: string }) => {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("streak_bonuses")
        .select("bonus_day, streak, stars")
        .eq("child_id", childId)
        .order("bonus_day", { ascending: false })
        .limit(14);
      setRows(data ?? []);
    };
    load();
    const ch = supabase
      .channel(`streak-${childId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "streak_bonuses", filter: `child_id=eq.${childId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [childId]);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const last = rows[0];
  const current = last && (last.bonus_day === today || last.bonus_day === yesterday) ? last.streak : 0;
  const total = rows.reduce((s, r) => s + r.stars, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">🔥 Дни подряд и бонусы</CardTitle>
        <p className="text-sm text-muted-foreground">
          Сейчас: <b>{current}</b> дн. подряд · бонусов за 2 недели: <b>+{total} ⭐</b>
        </p>
        <p className="text-xs text-muted-foreground">Со 2-го дня подряд: +2 ⭐ за каждый день серии (до +14 ⭐ в день). Звёзды тратятся в домике.</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Бонусов пока нет.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {rows.map((r) => (
              <li key={r.bonus_day} className="flex justify-between">
                <span>{new Date(r.bonus_day).toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" })} · {r.streak}-й день</span>
                <span className="font-semibold">{r.stars > 0 ? `+${r.stars} ⭐` : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
