import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { speak } from "@/lib/sound";
import { daysWord } from "@/lib/pet-growth";

const SEEDS: Record<string, { name: string; icon: string; days: number; reward: number }> = {
  radish: { name: "Редиска", icon: "🌶️", days: 1, reward: 3 },
  carrot: { name: "Морковка", icon: "🥕", days: 2, reward: 5 },
  tomato: { name: "Помидор", icon: "🍅", days: 3, reward: 8 },
  sunflower: { name: "Подсолнух", icon: "🌻", days: 4, reward: 11 },
  pumpkin: { name: "Тыква", icon: "🎃", days: 5, reward: 15 },
};
const SLOTS = 6;

interface Plot { slot: number; seed: string; planted_at: string; last_watered_at: string | null }

export const Garden = () => {
  const { toast } = useToast();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [picking, setPicking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("garden_plots").select("slot, seed, planted_at, last_watered_at").eq("user_id", user.id);
    setPlots((data as Plot[]) ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<void>) => { setBusy(true); await fn(); await load(); setBusy(false); };

  const plant = (slot: number, seed: string) => run(async () => {
    setPicking(null);
    const { data } = await supabase.rpc("garden_plant", { _slot: slot, _seed: seed });
    if (data) { void speak(`Посадили: ${SEEDS[seed].name}!`); toast({ title: `🌱 ${SEEDS[seed].name} посажена!` }); }
  });
  const water = (slot: number) => run(async () => {
    const { data } = await supabase.rpc("garden_water", { _slot: slot });
    if (data) { void speak("Полили! Растение радо!"); toast({ title: "💧 Полито!" }); }
    else toast({ title: "Сегодня уже полито 💧", description: "Приходи завтра!" });
  });
  const harvest = (slot: number) => run(async () => {
    const { data } = await supabase.rpc("garden_harvest", { _slot: slot });
    if (data && data > 0) { void speak(`Урожай! Плюс ${data} звёзд!`); toast({ title: `🧺 Урожай! +${data} ⭐` }); }
  });

  const today = new Date().toDateString();

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-r from-lime-100 to-emerald-100 border-emerald-200">
        <h2 className="text-xl font-bold text-emerald-900">🌱 Мой садик</h2>
        <p className="text-sm text-emerald-800">Посади семечко, поливай каждый день и собери урожай — получишь звёзды!</p>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: SLOTS }, (_, slot) => {
          const p = plots.find((x) => x.slot === slot);
          if (!p) {
            return (
              <Card key={slot} className="p-4 flex flex-col items-center justify-center gap-2 min-h-[180px] bg-amber-50 border-dashed border-2 border-amber-300">
                <div className="text-4xl">🟫</div>
                {picking === slot ? (
                  <div className="grid grid-cols-1 gap-1 w-full">
                    {Object.entries(SEEDS).map(([k, s]) => (
                      <Button key={k} size="sm" variant="outline" disabled={busy} onClick={() => plant(slot, k)} className="justify-between">
                        <span>{s.icon} {s.name}</span>
                        <span className="text-xs">{s.days} {daysWord(s.days)} · +{s.reward}⭐</span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Button size="sm" onClick={() => setPicking(slot)}>Посадить</Button>
                )}
              </Card>
            );
          }
          const s = SEEDS[p.seed];
          const total = s.days * 86400000;
          const passed = Date.now() - new Date(p.planted_at).getTime();
          const pct = Math.min(100, (passed / total) * 100);
          const ready = pct >= 100;
          const stageIcon = ready ? s.icon : pct < 34 ? "🌱" : pct < 67 ? "🌿" : "🪴";
          const wateredToday = p.last_watered_at && new Date(p.last_watered_at).toDateString() === today;
          const leftDays = Math.ceil((total - passed) / 86400000);
          return (
            <Card key={slot} className="p-4 flex flex-col items-center gap-2 min-h-[180px] bg-gradient-to-b from-sky-50 to-amber-100">
              <div className={`text-5xl ${ready ? "animate-bounce-gentle" : ""}`}>{stageIcon}</div>
              <p className="font-bold text-sm">{s.name}</p>
              <Progress value={pct} className="w-full" />
              <p className="text-xs text-muted-foreground">
                {ready ? "Готово! 🎉" : leftDays <= 1 ? "Созреет сегодня-завтра" : `Ещё ${leftDays} ${daysWord(leftDays)}`}
              </p>
              {ready ? (
                <Button size="sm" className="w-full" disabled={busy} onClick={() => harvest(slot)}>🧺 Собрать +{s.reward}⭐</Button>
              ) : (
                <Button size="sm" variant="outline" className="w-full" disabled={busy || !!wateredToday} onClick={() => water(slot)}>
                  {wateredToday ? "💧 Полито" : "💧 Полить"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
