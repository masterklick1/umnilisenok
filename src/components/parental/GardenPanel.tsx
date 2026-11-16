import { useLanguage } from "@/contexts/LanguageContext";
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

const fmt = (d: string, locale: string) => new Date(d).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dur = (ms: number, language: string) => {
  const h = Math.round(ms / 3600000);
  if (language === "en") return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} hr` : `${h} hr`;
  return h >= 24 ? `${Math.floor(h / 24)} д ${h % 24} ч` : `${h} ч`;
};

export const GardenPanel = ({ childId, childName }: { childId: string; childName: string }) => {
  const { t, label, language } = useLanguage();
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
        <CardHeader><CardTitle className="text-lg">{t("🌱 Садик:", "🌱 Garden:")} {childName}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-secondary p-2"><p className="text-2xl font-bold">{plots.length}</p><p className="text-xs">{t("растёт", "growing")}</p></div>
            <div className="rounded-xl bg-secondary p-2"><p className="text-2xl font-bold">{harvests.length}</p><p className="text-xs">{t("урожаев", "harvests")}</p></div>
            <div className="rounded-xl bg-secondary p-2"><p className="text-2xl font-bold">{totalStars}⭐</p><p className="text-xs">{t("заработано", "earned")}</p></div>
          </div>
          {plots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Сейчас ничего не посажено.", "Nothing is planted yet.")}</p>
          ) : plots.map((p) => {
            const s = SEEDS[p.seed];
            const passed = Date.now() - new Date(p.planted_at).getTime();
            const pct = Math.min(100, (passed / (s.days * 86400000)) * 100);
            return (
              <div key={p.slot} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{s.icon} {label(s.name)} {t("· грядка", "· patch")} {p.slot + 1}</span>
                  <span className="text-muted-foreground">{pct >= 100 ? t("готово к сбору", "ready to harvest") : t(`растёт ${dur(passed, language)} из ${s.days} д`, `growing for ${dur(passed, language)} of ${s.days} days`)}</span>
                </div>
                <Progress value={pct} />
                <p className="text-[11px] text-muted-foreground">
                  {t("Посажено", "Planted")} {fmt(p.planted_at, language)} · {p.last_watered_at ? t(`полито ${fmt(p.last_watered_at, language)}`, `watered ${fmt(p.last_watered_at, language)}`) : t("ещё не поливали", "not watered yet")}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">{t("🧺 Урожай", "🧺 Harvest")}</CardTitle></CardHeader>
        <CardContent>
          {harvests.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Урожая пока не было.", "No harvests yet.")}</p>
          ) : (
            <div className="space-y-2">
              {harvests.map((h) => (
                <div key={h.id} className="flex justify-between text-sm border-b pb-1">
                  <span>{SEEDS[h.seed]?.icon} {label(SEEDS[h.seed]?.name ?? h.seed)}</span>
                  <span className="text-xs text-muted-foreground text-right">
                    {t("росло", "grew for")} {dur(new Date(h.harvested_at).getTime() - new Date(h.planted_at).getTime(), language)} {t("· собрано", "· harvested")} {fmt(h.harvested_at, language)} · +{h.stars}⭐
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
