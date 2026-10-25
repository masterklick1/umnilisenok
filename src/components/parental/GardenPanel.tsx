import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const SEEDS: Record<string, { name: string; icon: string; days: number }> = {
  radish: { name: "Редиска", icon: "🌶️", days: 1 },
  carrot: { name: "Морковка", icon: "🥕", days: 2 },
  tomato: { name: "Помидор", icon: "🍅", days: 3 },
  sunflower: { name: "Подсолнух", icon: "🌻", days: 4 },
  pumpkin: { name: "Тыква", icon: "🎃", days: 5 },
};

type Plot = { slot: number; seed: string; planted_at: string; last_watered_at: string | null };
type Harvest = { id: string; seed: string; planted_at: string; harvested_at: string; stars: number };

const fmt = (d: string) => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dur = (ms: number) => {
  const h = Math.round(ms / 3600000);
  return h >= 24 ? `${Math.floor(h / 24)} д ${h % 24} ч` : `${h} ч`;
};

export const GardenPanel = ({ childId, childName }: { childId: string; childName: string }) => {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);

  const load = useCallback(async () => {
    const [{ data: p }, { data: h }] = await Promise.all([
      supabase.from("garden_plots").select("slot, seed, planted_at, last_watered_at").eq("user_id", childId).order("slot"),
      supabase.from("garden_harvests").select("id, seed, planted_at, harvested_at, stars").eq("user_id", childId).order("harvested_at", { ascending: false }).limit(30),
    ]);
    setPlots((p as Plot[]) ?? []);
    setHarvests((h as Harvest[]) ?? []);
  }, [childId]);

  useEffect(() => {
    void load();
    const ch = supabase.channel(`garden-${childId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_plots", filter: `user_id=eq.${childId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "garden_harvests", filter: `user_id=eq.${childId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [childId, load]);

  const totalStars = harvests.reduce((s, h) => s + h.stars, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">🌱 Садик: {childName}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-secondary p-2"><p className="text-2xl font-bold">{plots.length}</p><p className="text-xs">растёт</p></div>
            <div className="rounded-xl bg-secondary p-2"><p className="text-2xl font-bold">{harvests.length}</p><p className="text-xs">урожаев</p></div>
            <div className="rounded-xl bg-secondary p-2"><p className="text-2xl font-bold">{totalStars}⭐</p><p className="text-xs">заработано</p></div>
          </div>
          {plots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Сейчас ничего не посажено.</p>
          ) : plots.map((p) => {
            const s = SEEDS[p.seed];
            const passed = Date.now() - new Date(p.planted_at).getTime();
            const pct = Math.min(100, (passed / (s.days * 86400000)) * 100);
            return (
              <div key={p.slot} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{s.icon} {s.name} · грядка {p.slot + 1}</span>
                  <span className="text-muted-foreground">{pct >= 100 ? "готово к сбору" : `растёт ${dur(passed)} из ${s.days} д`}</span>
                </div>
                <Progress value={pct} />
                <p className="text-[11px] text-muted-foreground">
                  Посажено {fmt(p.planted_at)} · {p.last_watered_at ? `полито ${fmt(p.last_watered_at)}` : "ещё не поливали"}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">🧺 Урожай</CardTitle></CardHeader>
        <CardContent>
          {harvests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Урожая пока не было.</p>
          ) : (
            <div className="space-y-2">
              {harvests.map((h) => (
                <div key={h.id} className="flex justify-between text-sm border-b pb-1">
                  <span>{SEEDS[h.seed]?.icon} {SEEDS[h.seed]?.name ?? h.seed}</span>
                  <span className="text-xs text-muted-foreground text-right">
                    росло {dur(new Date(h.harvested_at).getTime() - new Date(h.planted_at).getTime())} · собрано {fmt(h.harvested_at)} · +{h.stars}⭐
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
