import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fetchReadingLearned } from "@/hooks/useReadingProgress";
import { READING_LEVEL_TITLES, readingItemsForLevel } from "@/lib/reading-items";

type ReadingActivity = {
  child_id: string;
  activity_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export const ReadingProgressCard = ({ childId, activities }: {
  childId: string;
  activities: ReadingActivity[];
}) => {
  const { t } = useLanguage();
  const [learned, setLearned] = useState<Set<string> | null>(null);

  useEffect(() => {
    let active = true;
    setLearned(null);
    const load = () => fetchReadingLearned(childId).then((s) => active && setLearned(s));
    load();
    const ch = supabase
      .channel(`reading-${childId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reading_progress", filter: `child_id=eq.${childId}` },
        load
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "learning_progress", filter: `child_id=eq.${childId}` },
        load
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [childId]);

  const today = new Date().toDateString();
  const readingToday = activities.filter((activity) =>
    activity.child_id === childId &&
    activity.details?.section === "reading" &&
    new Date(activity.created_at).toDateString() === today
  );
  const itemsFor = (type: string) => [...new Set(readingToday
    .filter((activity) => activity.activity_type === type)
    .flatMap((activity) => typeof activity.details?.item === "string" ? [activity.details.item] : []))];
  const correctToday = itemsFor("answer_correct");
  const practiceToday = itemsFor("answer_wrong");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("📖 Прогресс в «Чтении»", "📖 Reading progress")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(correctToday.length > 0 || practiceToday.length > 0) && (
          <div className="space-y-1 rounded-xl bg-muted p-3 text-sm">
            {correctToday.length > 0 && <p><strong>{t("Сегодня получилось", "Completed today")}</strong> · {correctToday.join(", ")}</p>}
            {practiceToday.length > 0 && <p><strong>{t("Стоит повторить", "Practice again")}</strong> · {practiceToday.join(", ")}</p>}
          </div>
        )}
        {!learned ? (
          <p className="text-sm text-muted-foreground">{t("Загрузка…", "Loading…")}</p>
        ) : (
          [1, 2, 3, 4].map((lvl) => {
            const items = [...new Set(readingItemsForLevel(lvl))];
            const done = items.filter((x) => learned.has(x));
            const pct = Math.round((done.length / items.length) * 100);
            return (
              <div key={lvl} className="space-y-1.5">
                <div className="flex justify-between text-sm font-medium">
                  <span>{READING_LEVEL_TITLES[lvl]}</span>
                  <span>{done.length} {t("из", "of")} {items.length}</span>
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
