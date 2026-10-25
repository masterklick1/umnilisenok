import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoomItem, UserRoomItem } from "@/hooks/useVirtualHome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Lock } from "lucide-react";

const SUBJECT_NAMES: Record<string, string> = {
  alphabet: "🔤 Алфавит",
  reading: "📖 Чтение",
  tales: "📚 Сказки",
  english: "🇬🇧 Английский",
};

interface Props {
  items: RoomItem[];
  owned: UserRoomItem[];
  onClaim: (item: RoomItem) => Promise<boolean>;
}

export const RewardItems = ({ items, owned, onClaim }: Props) => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const subjects = Array.from(new Set(items.map((i) => i.unlock_subject).filter(Boolean))) as string[];
    Promise.all(
      subjects.map(async (s) => {
        const { data } = await supabase.rpc("learned_count", { _subject: s });
        return [s, (data as number) ?? 0] as const;
      })
    ).then((pairs) => setCounts(Object.fromEntries(pairs)));
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Эти вещи нельзя купить — их можно только заслужить учёбой! 🦊
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => {
          const need = item.unlock_count ?? 1;
          const have = counts[item.unlock_subject ?? ""] ?? 0;
          const ready = have >= need;
          const isOwned = owned.some((o) => o.item_id === item.id);
          return (
            <Card key={item.id} className="p-4 flex flex-col items-center gap-2 text-center">
              <div className={`text-5xl ${ready || isOwned ? "" : "grayscale opacity-50"}`}>{item.icon}</div>
              <p className="font-bold">{item.name}</p>
              <p className="text-xs text-muted-foreground">{SUBJECT_NAMES[item.unlock_subject ?? ""]}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
              {!isOwned && (
                <div className="w-full space-y-1">
                  <Progress value={Math.min(100, (have / need) * 100)} />
                  <p className="text-xs font-medium">{Math.min(have, need)} из {need}</p>
                </div>
              )}
              {isOwned ? (
                <Button variant="secondary" disabled className="w-full gap-1">
                  <Check className="w-4 h-4" /> В комнате
                </Button>
              ) : ready ? (
                <Button
                  className="w-full"
                  disabled={busy === item.id}
                  onClick={async () => {
                    setBusy(item.id);
                    await onClaim(item);
                    setBusy(null);
                  }}
                >
                  🎁 Забрать
                </Button>
              ) : (
                <Button variant="outline" disabled className="w-full gap-1">
                  <Lock className="w-4 h-4" /> Закрыто
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
