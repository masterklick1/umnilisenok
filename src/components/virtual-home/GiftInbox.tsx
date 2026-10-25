import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { speak } from "@/lib/sound";

type Gift = { id: string; title: string; message: string | null; item_ids: string[] };

export const GiftInbox = ({ onOpened }: { onOpened?: () => void }) => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [opened, setOpened] = useState<{ gift: Gift; icons: string[] } | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("parent_gifts").select("id, title, message, item_ids").eq("child_id", user.id).is("opened_at", null).order("created_at");
    setGifts((data as Gift[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase.channel("gift-inbox").on("postgres_changes", { event: "*", schema: "public", table: "parent_gifts" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  useEffect(() => { if (gifts.length) void speak("Тебе подарок от мамы или папы! Открой его!"); }, [gifts.length]);

  const open = async (g: Gift) => {
    const { data } = await supabase.rpc("open_parent_gift", { _gift_id: g.id });
    if (!data) return;
    const { data: items } = await supabase.from("room_items").select("icon").in("id", g.item_ids);
    setOpened({ gift: g, icons: (items ?? []).map((i) => i.icon) });
    void speak(g.message ? `Ура! ${g.message}` : "Ура! Смотри, что внутри!");
    await load();
    onOpened?.();
  };

  if (opened) {
    return (
      <Card className="p-5 text-center bg-gradient-to-br from-pink-100 to-amber-100 border-pink-200 animate-pop-in">
        <div className="text-5xl mb-2">{opened.icons.join(" ")}</div>
        <p className="font-bold">{opened.gift.title}</p>
        {opened.gift.message && <p className="text-sm italic mt-1">«{opened.gift.message}»</p>}
        <p className="text-xs text-muted-foreground mt-2">Всё уже в твоей комнате! 🏠</p>
        <Button size="sm" className="mt-3" onClick={() => setOpened(null)}>Спасибо! ❤️</Button>
      </Card>
    );
  }

  if (!gifts.length) return null;
  return (
    <div className="space-y-2">
      {gifts.map((g) => (
        <Card key={g.id} className="p-4 flex items-center gap-3 bg-gradient-to-r from-pink-100 to-rose-100 border-pink-200">
          <div className="text-5xl animate-bounce-gentle">🎁</div>
          <div className="flex-1">
            <p className="font-bold">Подарок от родителя!</p>
            <p className="text-xs text-muted-foreground">Что же там внутри?</p>
          </div>
          <Button onClick={() => open(g)}>Открыть</Button>
        </Card>
      ))}
    </div>
  );
};
