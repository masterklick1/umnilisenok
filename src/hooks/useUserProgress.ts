import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface UserProgress {
  id: string;
  user_id: string;
  stars: number;
  level: number;
  experience: number;
  daily_streak: number;
  last_activity_date: string | null;
}

type AchievementCategory = "math" | "alphabet" | "world" | "creativity" | "streak";

const todayStr = () => new Date().toISOString().split("T")[0];
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

export const useUserProgress = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      setProgress(data);
    } catch (e) {
      console.error("Error fetching progress:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Проверка достижений по категории
  const checkAchievements = useCallback(
    async (category: AchievementCategory | null, currentStreak: number) => {
      if (!user) return 0;
      try {
        // Уже разблокированные
        const { data: unlocked } = await supabase
          .from("user_achievements")
          .select("achievement_id")
          .eq("user_id", user.id);
        const unlockedIds = new Set((unlocked || []).map((u) => u.achievement_id));

        // Все ачивки
        const { data: allAch } = await supabase.from("achievements").select("*");
        if (!allAch) return 0;

        let counts: Record<string, number> | null = null;
        const need = allAch.filter(
          (a) =>
            !unlockedIds.has(a.id) &&
            ((a.category === category && a.requirement_type === "count") ||
              (a.category === "streak" && a.requirement_type === "streak"))
        );
        if (need.length === 0) return 0;

        // Подгружаем счётчики правильных ответов по категории (если нужно)
        if (need.some((a) => a.requirement_type === "count")) {
          const { data: acts } = await supabase
            .from("child_activity")
            .select("details")
            .eq("child_id", user.id)
            .eq("activity_type", "answer_correct");
          counts = {};
          (acts || []).forEach((row) => {
            const sec = (row.details as { section?: string } | null)?.section;
            if (sec) counts![sec] = (counts![sec] || 0) + 1;
          });
        }

        let totalReward = 0;
        for (const a of need) {
          const value =
            a.requirement_type === "streak"
              ? currentStreak
              : counts?.[a.category] ?? 0;
          if (value >= a.requirement_value) {
            const { error: insErr } = await supabase.from("user_achievements").insert({
              user_id: user.id,
              achievement_id: a.id,
            });
            if (!insErr) {
              totalReward += a.reward_stars || 0;
              toast({
                title: `${a.icon} Новое достижение!`,
                description: `${a.title} — +${a.reward_stars} ⭐`,
              });
            }
          }
        }
        return totalReward;
      } catch (e) {
        console.error("Achievements check error:", e);
        return 0;
      }
    },
    [user, toast]
  );

  const addStars = useCallback(
    async (amount: number, category: AchievementCategory | null = null) => {
      if (!user || !progress) return;
      try {
        // Расчёт streak
        const today = todayStr();
        const last = progress.last_activity_date;
        let newStreak = progress.daily_streak || 0;
        if (last !== today) {
          newStreak = last === yesterdayStr() ? newStreak + 1 : 1;
        }

        const newStars = progress.stars + amount;
        const newExperience = progress.experience + amount;
        const newLevel = Math.floor(newExperience / 100) + 1;

        const { error } = await supabase
          .from("user_progress")
          .update({
            stars: newStars,
            experience: newExperience,
            level: newLevel,
            daily_streak: newStreak,
            last_activity_date: today,
          })
          .eq("user_id", user.id);
        if (error) throw error;

        // Локальное состояние
        let merged: UserProgress = {
          ...progress,
          stars: newStars,
          experience: newExperience,
          level: newLevel,
          daily_streak: newStreak,
          last_activity_date: today,
        };

        if (newLevel > progress.level) {
          toast({ title: "🎉 Новый уровень!", description: `Поздравляем! Ты достиг ${newLevel} уровня!` });
        }
        if (newStreak > (progress.daily_streak || 0) && newStreak > 1) {
          toast({ title: `🔥 Серия ${newStreak} дней!`, description: "Ты занимаешься каждый день, молодец!" });
        }

        // Проверяем достижения и начисляем бонусные звёзды
        const bonus = await checkAchievements(category, newStreak);
        if (bonus > 0) {
          const bonusStars = merged.stars + bonus;
          const bonusExp = merged.experience + bonus;
          const bonusLevel = Math.floor(bonusExp / 100) + 1;
          await supabase
            .from("user_progress")
            .update({ stars: bonusStars, experience: bonusExp, level: bonusLevel })
            .eq("user_id", user.id);
          merged = { ...merged, stars: bonusStars, experience: bonusExp, level: bonusLevel };
        }

        setProgress(merged);
      } catch (e) {
        console.error("Error adding stars:", e);
        toast({ title: "Ошибка", description: "Не удалось обновить прогресс", variant: "destructive" });
      }
    },
    [user, progress, toast, checkAchievements]
  );

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, loading, addStars, refetch: fetchProgress };
};
