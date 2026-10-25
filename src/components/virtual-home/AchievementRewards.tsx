import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pet, RoomItem, UserPet, UserRoomItem } from "@/hooks/useVirtualHome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Lock } from "lucide-react";

interface Props {
  items: RoomItem[];
  pets: Pet[];
  owned: UserRoomItem[];
  ownedPets: UserPet[];
  onClaim: (item: RoomItem) => Promise<boolean>;
  onPetClaimed: () => void;
}

type Ach = { id: string; title: string; icon: string };

export const AchievementRewards = ({ items, pets, owned, ownedPets, onClaim, onPetClaimed }: Props) => {
  const { toast } = useToast();
  const [achs, setAchs] = useState<Record<string, Ach>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: all } = await supabase.from("achievements").select("id, title, icon");
      setAchs(Object.fromEntries(((all as Ach[]) ?? []).map((a) => [a.id, a])));
      if (user) {
        const { data: u } = await supabase.from("user_achievements").select("achievement_id").eq("user_id", user.id);
        setMine(new Set((u ?? []).map((r) => r.achievement_id)));
      }
    })();
  }, []);

  if (items.length + pets.length === 0) return null;

  const entries = [
    ...items.map((i) => ({ kind: "item" as const, id: i.id, name: i.name, icon: i.icon, ach: i.unlock_achievement_id!, isFrame: i.category === "frame", owned: owned.some((o) => o.item_id === i.id), raw: i })),
    ...pets.map((p) => ({ kind: "pet" as const, id: p.id, name: p.name ?? p.species ?? "", icon: p.icon, ach: p.unlock_achievement_id!, isFrame: false, owned: ownedPets.some((o) => o.pet_id === p.id), raw: p })),
  ];

  const claim = async (e: (typeof entries)[number]) => {
    setBusy(e.id);
    if (e.kind === "item") await onClaim(e.raw as RoomItem);
    else {
      const { data } = await supabase.rpc("claim_reward_pet", { _pet_id: e.id, _name: e.name });
      if (data) { toast({ title: `Новый друг: ${e.name}! ${e.icon}` }); onPetClaimed(); }
      else toast({ title: "Пока рано 🦊", variant: "destructive" });
    }
    setBusy(null);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-bold">🏅 Редкие вещи за достижения</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {entries.map((e) => {
          const a = achs[e.ach];
          const ready = mine.has(e.ach);
          return (
            <Card key={e.id} className="p-3 flex flex-col items-center gap-1 text-center">
              <div className={`text-5xl ${ready || e.owned ? "" : "grayscale opacity-50"}`}>{e.icon}</div>
              <p className="font-bold text-sm">{e.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {e.kind === "pet" ? "Редкий питомец" : e.isFrame ? "Рамки для рисунков" : "Мебель"}
              </p>
              <p className="text-xs">{a ? `${a.icon} «${a.title}»` : ""}</p>
              {e.owned ? (
                <Button size="sm" variant="secondary" disabled className="w-full gap-1"><Check className="w-4 h-4" /> Есть</Button>
              ) : ready ? (
                <Button size="sm" className="w-full" disabled={busy === e.id} onClick={() => claim(e)}>🎁 Забрать</Button>
              ) : (
                <Button size="sm" variant="outline" disabled className="w-full gap-1"><Lock className="w-4 h-4" /> Закрыто</Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
