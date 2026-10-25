import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Item = { id: string; name: string; icon: string; category: string };
type Gift = { id: string; title: string; created_at: string; opened_at: string | null };

export const GiftSender = ({ childId, childName }: { childId: string; childName: string }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [busy, setBusy] = useState(false);

  const loadGifts = async () => {
    const { data } = await supabase.from("parent_gifts").select("id, title, created_at, opened_at").eq("child_id", childId).order("created_at", { ascending: false }).limit(10);
    setGifts((data as Gift[]) ?? []);
  };

  useEffect(() => {
    supabase.from("room_items").select("id, name, icon, category").is("unlock_subject", null).is("unlock_achievement_id", null)
      .then(({ data }) => setItems((data as Item[]) ?? []));
    void loadGifts();
    const ch = supabase.channel(`gifts-${childId}`).on("postgres_changes", { event: "*", schema: "public", table: "parent_gifts", filter: `child_id=eq.${childId}` }, loadGifts).subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 10 ? p : [...p, id]));

  const send = async () => {
    setBusy(true);
    const names = items.filter((i) => picked.includes(i.id)).map((i) => i.name);
    const title = names.length > 1 ? `Набор: ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}` : names[0];
    const { data } = await supabase.rpc("send_parent_gift", { _child_id: childId, _item_ids: picked, _title: title, _message: message.trim() || null });
    setBusy(false);
    if (data) { toast({ title: "🎁 Подарок положен в домик!" }); setPicked([]); setMessage(""); }
    else toast({ title: "Не удалось отправить подарок", variant: "destructive" });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">🎁 Подарок в домик для {childName}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Выберите мебель или игрушки (до 10). Ребёнок найдёт коробку в домике и откроет её.</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
          {items.map((i) => (
            <button key={i.id} onClick={() => toggle(i.id)} title={i.name}
              className={`p-2 rounded-xl border-2 flex flex-col items-center ${picked.includes(i.id) ? "border-primary bg-primary/10" : "border-border"}`}>
              <span className="text-2xl">{i.icon}</span>
              <span className="text-[10px] truncate max-w-full">{i.name}</span>
            </button>
          ))}
        </div>
        <Input placeholder="Записка, например: Молодец! Люблю тебя ❤️" value={message} maxLength={200} onChange={(e) => setMessage(e.target.value)} />
        <Button className="w-full" disabled={!picked.length || busy} onClick={send}>Положить подарок ({picked.length})</Button>
        {gifts.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-sm font-medium">Отправленные:</p>
            {gifts.map((g) => (
              <div key={g.id} className="flex justify-between text-xs">
                <span className="truncate">{g.title}</span>
                <span className={g.opened_at ? "text-primary" : "text-muted-foreground"}>
                  {g.opened_at ? `открыт ${new Date(g.opened_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "ждёт в домике"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
