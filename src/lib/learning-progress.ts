import { supabase } from "@/integrations/supabase/client";
import { getActivityChildId } from "@/lib/activity-log";
import { isDemoUserId } from "@/lib/demo-session";

export type LearningSubject = "alphabet" | "tales" | "english" | "reading";

export const SUBJECT_TITLES: Record<LearningSubject, string> = {
  alphabet: "🔤 Алфавит",
  reading: "📖 Чтение",
  tales: "📚 Сказки, загадки, считалки",
  english: "🇬🇧 Английский",
};

/** Отмечает элемент как пройденный для текущего ребёнка (в базе). */
export const recordLearned = async (subject: LearningSubject, item: string) => {
  const { data } = await supabase.auth.getSession();
  const childId = getActivityChildId(data.session?.user.id);
  if (!childId || isDemoUserId(childId) || !item) return;
  const { error } = await supabase.rpc("mark_learned_for", {
    _child_id: childId,
    _subject: subject,
    _item: item.slice(0, 60),
  });
  if (error) console.warn("learning progress save failed", error);
};
