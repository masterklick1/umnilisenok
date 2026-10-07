import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { demoProgress, isDemoUser } from "@/lib/demo-session";

export interface UserProgress {
  id?: string;
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

  const progressRef = useRef<UserProgress | null>(null);
  progressRef.current = progress;

  const fetchProgress = useCallback(async () => {
    if (isDemoUser(user)) {
      const demoData = {
        ...demoProgress,
        game_tickets: (demoProgress as any).game_tickets ?? 5,
      };
      setProgress(demoData);
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
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching progress:", error);
      }

      if (data) {
        setProgress({
          ...data,
          game_tickets: data.game_tickets ?? 0,
        });
      } else {
        setProgress({
          user_id: user.id,
          stars: 0,
          level: 1,
          experience: 0,
          daily_streak: 0,
          game_tickets: 0,
          last_activity_date: null,
        });
      }
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
            // Upsert для исключения ошибок уникальности
            const { error: insErr } = await supabase
              .from("user_achievements")
              .upsert(
                { user_id: user.id, achievement_id: a.id },
                { onConflict: "user_id,achievement_id" }
              );

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

  // Начисление звёзд
  const addStars = useCallback(
    async (
      amount: number,
      category: AchievementCategory | null = null,
      addTicket: boolean = false
    ) => {
      if (!user) return;

      const ticketsToAdd = addTicket ? 1 : 0;

      if (isDemo) {
        setProgress((cur) => {
          if (!cur) return null;
          const experience = cur.experience + amount;
          return {
            ...cur,
            stars: cur.stars + amount,
            game_tickets: (cur.game_tickets || 0) + ticketsToAdd,
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
        const currentProgress = progressRef.current || {
          user_id: user.id,
          stars: 0,
          level: 1,
          experience: 0,
          daily_streak: 0,
          game_tickets: 0,
          last_activity_date: null,
        };

        const last = currentProgress.last_activity_date;
        let newStreak = currentProgress.daily_streak || 0;
        if (last !== today) {
          newStreak = last === yesterdayStr() ? newStreak + 1 : 1;
        }

        const newStars = (currentProgress.stars || 0) + amount;
        const newTickets = (currentProgress.game_tickets || 0) + ticketsToAdd;
        const newExperience = (currentProgress.experience || 0) + amount;
        const newLevel = Math.floor(newExperience / 100) + 1;

        // Формируем полный объект payload со всеми атрибутами
        const payload = {
          user_id: user.id,
          stars: newStars,
          game_tickets: newTickets,
          experience: newExperience,
          level: newLevel,
          daily_streak: newStreak,
          last_activity_date: today,
        };

        // Оптимистичное обновление UI
        setProgress((prev) => ({ ...(prev || currentProgress), ...payload }));

        const { error } = await supabase
          .from("user_progress")
          .upsert(payload, { onConflict: "user_id" });

        if (error) throw error;

        if (newLevel > (currentProgress.level || 1)) {
          toast({ title: "🎉 Новый уровень!", description: `Поздравляем! Ты достиг ${newLevel} уровня!` });
        }
        if (newStreak > (currentProgress.daily_streak || 0) && newStreak > 1) {
          toast({ title: `🔥 Серия ${newStreak} дней!`, description: "Ты занимаешься каждый день, молодец!" });
        }
        if (addTicket) {
          toast({ title: "Получен билет на игру! 🎟️", description: "Используй его в виртуальном доме!" });
        }

        const bonus = await checkAchievements(category, newStreak);
        if (bonus > 0) {
          const bonusStars = newStars + bonus;
          const bonusExp = newExperience + bonus;
          const bonusLevel = Math.floor(bonusExp / 100) + 1;

          const bonusPayload = {
            user_id: user.id,
            stars: bonusStars,
            game_tickets: newTickets,
            experience: bonusExp,
            level: bonusLevel,
            daily_streak: newStreak,
            last_activity_date: today,
          };

          await supabase
            .from("user_progress")
            .upsert(bonusPayload, { onConflict: "user_id" });

          setProgress((prev) => (prev ? { ...prev, ...bonusPayload } : null));
        }
      } catch (e: any) {
        console.error("Error adding stars:", e);
        toast({
          title: "Ошибка обновления",
          description: e?.message || e?.details || "Не удалось сохранить прогресс в сети",
          variant: "destructive",
        });
      }
    },
    [user, isDemo, toast, checkAchievements]
  );

  // Начисление билетов
  const addGameTickets = useCallback(
    async (amount: number = 1) => {
      if (!user) return;

      if (isDemo) {
        setProgress((current) =>
          current ? { ...current, game_tickets: (current.game_tickets || 0) + amount } : current
        );
        toast({ title: `Начислено билетов: +${amount} 🎟️` });
        return;
      }

      try {
        const currentProgress = progressRef.current || {
          user_id: user.id,
          stars: 0,
          level: 1,
          experience: 0,
          daily_streak: 0,
          game_tickets: 0,
          last_activity_date: null,
        };

        const newTickets = (currentProgress.game_tickets || 0) + amount;

        // Передаем весь объект, а не только game_tickets
        const payload = {
          ...currentProgress,
          user_id: user.id,
          game_tickets: newTickets,
        };

        setProgress(payload);

        const { error } = await supabase
          .from("user_progress")
          .upsert(payload, { onConflict: "user_id" });

        if (error) throw error;

        toast({ title: `Начислено билетов: +${amount} 🎟️` });
      } catch (e: any) {
        console.error("Error adding tickets:", e);
        toast({
          title: "Ошибка",
          description: e?.message || "Не удалось добавить билеты",
          variant: "destructive",
        });
      }
    },
    [user, isDemo, toast]
  );

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, loading, addStars, addGameTickets, refetch: fetchProgress };
};
