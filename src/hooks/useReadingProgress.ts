import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getActivityChildId } from "@/lib/activity-log";
import { recordLearned } from "@/lib/learning-progress";
import { readingItemsForLevel } from "@/lib/reading-items";

/** Загружает пройденные элементы «Чтения» ребёнка из базы. */
export const fetchReadingLearned = async (childId: string): Promise<Set<string>> => {
  const [reading, shared] = await Promise.all([
    supabase.from("reading_progress").select("level, lesson_index").eq("child_id", childId),
    supabase.from("learning_progress").select("item").eq("child_id", childId).eq("subject", "reading"),
  ]);
  const set = new Set<string>();
  reading.data?.forEach((row) => {
    const item = readingItemsForLevel(row.level)[row.lesson_index];
    if (item) set.add(item);
  });
  shared.data?.forEach(({ item }) => set.add(item));
  return set;
};

/** Пройденные буквы/слоги/слова в «Чтении». Хранится в базе + копия на устройстве. */
export const useReadingProgress = () => {
  const { user, isDemo } = useAuth();
  const { isChild, loading: roleLoading } = useUserRole();
  const childId = isChild || isDemo ? user?.id ?? null : getActivityChildId(user?.id);
  const key = `reading_progress_${childId ?? "guest"}`;
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
    if (!childId || isDemo) return;
    fetchReadingLearned(childId).then((remote) => {
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
  }, [childId, isDemo, key]);

  const markLearned = useCallback(
    async (item: string, level: number) => {
      setLearned((prev) => {
        if (prev.has(item)) return prev;
        const next = new Set(prev).add(item);
        localStorage.setItem(key, JSON.stringify([...next]));
        return next;
      });
      if (!childId || isDemo) return;
      if (childId !== user?.id) {
        await recordLearned("reading", item);
        return;
      }
      const idx = readingItemsForLevel(level).indexOf(item);
      if (idx < 0) return;
      const { error } = await supabase.from("reading_progress").upsert(
        { child_id: childId, level, lesson_index: idx, completed_at: new Date().toISOString() },
        { onConflict: "child_id,level,lesson_index" }
      );
      if (error) console.warn("reading progress save failed", error);
    },
    [childId, user?.id, isDemo, key]
  );

  return { childId, learned, markLearned, roleLoading };
};
