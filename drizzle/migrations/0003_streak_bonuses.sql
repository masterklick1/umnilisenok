CREATE TABLE public.streak_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bonus_day date NOT NULL DEFAULT current_date,
  streak integer NOT NULL,
  stars integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, bonus_day)
);
GRANT SELECT ON public.streak_bonuses TO authenticated;
GRANT ALL ON public.streak_bonuses TO service_role;
ALTER TABLE public.streak_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Child views own streak bonuses" ON public.streak_bonuses FOR SELECT TO authenticated USING (auth.uid() = child_id);
CREATE POLICY "Parents view linked child streak bonuses" ON public.streak_bonuses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parent_child_links l WHERE l.parent_id = auth.uid() AND l.child_id = streak_bonuses.child_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.streak_bonuses;

CREATE OR REPLACE FUNCTION public.claim_streak_bonus(_child_id uuid)
RETURNS TABLE(streak integer, bonus integer, claimed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_last date; v_streak integer; v_bonus integer := 0; v_today date := current_date;
BEGIN
  IF auth.uid() IS NULL OR _child_id IS NULL THEN RETURN; END IF;
  IF _child_id <> auth.uid() AND NOT EXISTS (SELECT 1 FROM parent_child_links l WHERE l.parent_id = auth.uid() AND l.child_id = _child_id) THEN RETURN; END IF;

  SELECT last_activity_date, COALESCE(daily_streak,0) INTO v_last, v_streak FROM user_progress WHERE user_id = _child_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM streak_bonuses b WHERE b.child_id = _child_id AND b.bonus_day = v_today) THEN
    RETURN QUERY SELECT GREATEST(v_streak,1), 0, false; RETURN;
  END IF;

  IF v_last = v_today THEN v_streak := GREATEST(v_streak, 1);
  ELSIF v_last = v_today - 1 THEN v_streak := v_streak + 1;
  ELSE v_streak := 1; END IF;

  IF v_streak >= 2 THEN v_bonus := LEAST(v_streak, 7) * 2; END IF;

  UPDATE user_progress SET daily_streak = v_streak, last_activity_date = v_today, stars = stars + v_bonus WHERE user_id = _child_id;
  INSERT INTO streak_bonuses (child_id, bonus_day, streak, stars) VALUES (_child_id, v_today, v_streak, v_bonus) ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT v_streak, v_bonus, true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_streak_bonus(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_streak_bonus(uuid) TO authenticated;