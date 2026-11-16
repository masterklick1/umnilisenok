import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECT_TITLES, type LearningSubject } from "@/lib/learning-progress";

type Row = { subject: string; item: string; times_correct: number };

/** Всё пройденное ребёнком по предметам (кроме «Чтения», у него своя карточка). */
export const LearningProgressCard = ({ childId }: { childId: string }) => {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("learning_progress")
        .select("subject, item, times_correct")
        .eq("child_id", childId)
        .order("first_learned_at", { ascending: true });
      if (active) setRows(data ?? []);
    };
    load();
    const ch = supabase
      .channel(`learning-${childId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "learning_progress", filter: `child_id=eq.${childId}` }, load)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [childId]);

  const subjects: LearningSubject[] = ["alphabet", "tales", "english"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("🎓 Пройдено по предметам", "🎓 Learning by subject")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!rows ? (
          <p className="text-sm text-muted-foreground">{t("Загрузка…", "Loading…")}</p>
        ) : (
          subjects.map((s) => {
            const items = rows.filter((r) => r.subject === s);
            return (
              <div key={s} className="space-y-1.5">
                <div className="flex justify-between text-sm font-medium">
                  <span>{SUBJECT_TITLES[s]}</span>
                  <span>{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("Пока ничего", "Nothing yet")}</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {items.map((r) => (
                      <span key={r.item} className="text-xs font-bold bg-secondary rounded-full px-2 py-0.5" title={t(`Верно: ${r.times_correct} раз`, `Correct ${r.times_correct} times`)}>
                        {r.item}
                      </span>
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
