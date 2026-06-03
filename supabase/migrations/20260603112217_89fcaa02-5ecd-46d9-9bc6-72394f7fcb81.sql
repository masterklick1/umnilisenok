-- Уникальность достижений по пользователю
CREATE UNIQUE INDEX IF NOT EXISTS user_achievements_user_ach_uniq
  ON public.user_achievements (user_id, achievement_id);