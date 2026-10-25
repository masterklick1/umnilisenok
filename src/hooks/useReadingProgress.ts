import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { readingItemsForLevel } from "@/lib/reading-items";

/** Загружает пройденные элементы «Чтения» ребёнка из базы. */
export const fetchReadingLearned = async (childId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from("reading_progress")
    .select("level, lesson_index")
    .eq("child_id", childId);
  const set = new Set<string>();
  if (error || !data) return set;
  data.forEach((r) => {
    const item = readingItemsForLevel(r.level)[r.lesson_index];
    if (item) set.add(item);
  });
  return set;
};

/** Пройденные буквы/слоги/слова в «Чтении». Хранится в базе + копия на устройстве. */
export const useReadingProgress = () => {
  const { user, isDemo } = useAuth();
  const key = `reading_progress_${user?.id ?? "guest"}`;
  const readLocal = () => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch {
      return new Set<string>();
    }
  };
  const [learned, setLearned] = useState<Set<string>>(readLocal);

  useEffect(() => {
    let cancel = false;
    setLearned(readLocal());
    if (!user || isDemo) return;
    fetchReadingLearned(user.id).then((remote) => {
      if (cancel) return;
      setLearned((prev) => {
        const next = new Set([...prev, ...remote]);
        localStorage.setItem(key, JSON.stringify([...next]));
        return next;
      });
    });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDemo, key]);

  const markLearned = useCallback(
    async (item: string, level: number) => {
      setLearned((prev) => {
        if (prev.has(item)) return prev;
        const next = new Set(prev).add(item);
        localStorage.setItem(key, JSON.stringify([...next]));
        return next;
      });
      if (!user || isDemo) return;
      const idx = readingItemsForLevel(level).indexOf(item);
      if (idx < 0) return;
      const { error } = await supabase.from("reading_progress").upsert(
        { child_id: user.id, level, lesson_index: idx, completed_at: new Date().toISOString() },
        { onConflict: "child_id,level,lesson_index" }
      );
      if (error) console.warn("reading progress save failed", error);
    },
    [user, isDemo, key]
  );

  return { learned, markLearned };
};
