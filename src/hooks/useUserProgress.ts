import { useEffect, useState } from "react";
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

export const useUserProgress = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setProgress(data);
    } catch (error: any) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const addStars = async (amount: number) => {
    if (!user || !progress) return;

    try {
      const newStars = progress.stars + amount;
      const newExperience = progress.experience + amount;
      const newLevel = Math.floor(newExperience / 100) + 1;

      const { error } = await supabase
        .from("user_progress")
        .update({
          stars: newStars,
          experience: newExperience,
          level: newLevel,
          last_activity_date: new Date().toISOString().split("T")[0],
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProgress({
        ...progress,
        stars: newStars,
        experience: newExperience,
        level: newLevel,
      });

      if (newLevel > progress.level) {
        toast({
          title: "🎉 Новый уровень!",
          description: `Поздравляем! Ты достиг ${newLevel} уровня!`,
        });
      }
    } catch (error: any) {
      console.error("Error adding stars:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить прогресс",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [user]);

  return { progress, loading, addStars, refetch: fetchProgress };
};
