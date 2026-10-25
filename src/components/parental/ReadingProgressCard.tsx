import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fetchReadingLearned } from "@/hooks/useReadingProgress";
import { READING_LEVEL_TITLES, readingItemsForLevel } from "@/lib/reading-items";

export const ReadingProgressCard = ({ childId }: { childId: string }) => {
  const [learned, setLearned] = useState<Set<string> | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => fetchReadingLearned(childId).then((s) => active && setLearned(s));
    load();
    const ch = supabase
      .channel(`reading-${childId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reading_progress", filter: `child_id=eq.${childId}` },
        load
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [childId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">📖 Прогресс в «Чтении»</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!learned ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : (
          [1, 2, 3, 4].map((lvl) => {
            const items = readingItemsForLevel(lvl);
            const done = items.filter((x) => learned.has(x));
            const pct = Math.round((done.length / items.length) * 100);
            return (
              <div key={lvl} className="space-y-1.5">
                <div className="flex justify-between text-sm font-medium">
                  <span>{READING_LEVEL_TITLES[lvl]}</span>
                  <span>{done.length} из {items.length}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                {done.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {done.map((x) => (
                      <span key={x} className="text-xs font-bold bg-secondary rounded-full px-2 py-0.5">{x}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
