import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { demoProgress, isDemoUser } from "@/lib/demo-session";

export interface UserProgress {
  id: string;
  user_id: string;
  stars: number;
  level: number;
  experience: number;
  daily_streak: number;
  game_tickets: number;
  last_activity_date: string | null;
  last_lesson_at?: string | null;
}

type AchievementCategory = "math" | "alphabet" | "world" | "creativity" | "streak";

const todayStr = () => new Date().toISOString().split("T")[0];
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

export const useUserProgress = () => {
  const { user, isDemo } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (isDemoUser(user)) {
      setProgress({
        ...demoProgress,
        game_tickets: (demoProgress as any).game_tickets ?? 5,
      });
      setLoading(false);
      return;
    }

    if (!user) {
      setProgress(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setProgress({
        ...data,
        game_tickets: data.game_tickets ?? 0,
      });
    } catch (e) {
      console.error("Error fetching progress:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Проверка достижений по категории
  const checkAchievements = useCallback(
    async (category: AchievementCategory | null, currentStreak: number) => {
      if (!user || isDemo) return 0;
      try {
        const { data: unlocked } = await supabase
          .from("user_achievements")
          .select("achievement_id")
          .eq("user_id", user.id);
        const unlockedIds = new Set((unlocked || []).map((u) => u.achievement_id));

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
    [user, isDemo, toast]
  );

  // Добавление звёзд и билетов
  const addStars = useCallback(
    async (
      amount: number,
      category: AchievementCategory | null = null,
      addTicket: boolean = false
    ) => {
      if (!user || !progress) return;

      const ticketsToAdd = addTicket ? 1 : 0;

      if (isDemo) {
        setProgress((current) => {
          if (!current) return current;
          const experience = current.experience + amount;
          return {
            ...current,
            stars: current.stars + amount,
            game_tickets: (current.game_tickets || 0) + ticketsToAdd,
            experience,
            level: Math.floor(experience / 100) + 1,
            last_activity_date: todayStr(),
          };
        });

        if (addTicket) {
          toast({
            title: "Получен билет на игру! 🎟️",
            description: "Используй его в игровой комнате!",
          });
        }
        return;
      }

      try {
        const today = todayStr();
        const last = progress.last_activity_date;
        let newStreak = progress.daily_streak || 0;
        if (last !== today) {
          newStreak = last === yesterdayStr() ? newStreak + 1 : 1;
        }

        const newStars = progress.stars + amount;
        const newTickets = (progress.game_tickets || 0) + ticketsToAdd;
        const newExperience = progress.experience + amount;
        const newLevel = Math.floor(newExperience / 100) + 1;

        const { error } = await supabase
          .from("user_progress")
          .update({
            stars: newStars,
            game_tickets: newTickets,
            experience: newExperience,
            level: newLevel,
            daily_streak: newStreak,
            last_activity_date: today,
          })
          .eq("user_id", user.id);

        if (error) throw error;

        let merged: UserProgress = {
          ...progress,
          stars: newStars,
          game_tickets: newTickets,
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
        if (addTicket) {
          toast({ title: "Получен билет на игру! 🎟️", description: "Используй его в виртуальном доме!" });
        }

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
    [user, progress, isDemo, toast, checkAchievements]
  );

  // Прямое начисление билетов
  const addGameTickets = useCallback(
    async (amount: number = 1) => {
      if (!user || !progress) return;

      if (isDemo) {
        setProgress((current) =>
          current ? { ...current, game_tickets: (current.game_tickets || 0) + amount } : current
        );
        toast({ title: `Начислено билетов: +${amount} 🎟️` });
        return;
      }

      try {
        const newTickets = (progress.game_tickets || 0) + amount;
        const { error } = await supabase
          .from("user_progress")
          .update({ game_tickets: newTickets })
          .eq("user_id", user.id);

        if (error) throw error;

        setProgress({ ...progress, game_tickets: newTickets });
        toast({ title: `Начислено билетов: +${amount} 🎟️` });
      } catch (e) {
        console.error("Error adding tickets:", e);
      }
    },
    [user, progress, isDemo, toast]
  );

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, loading, addStars, addGameTickets, refetch: fetchProgress };
};
