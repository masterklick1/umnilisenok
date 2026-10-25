CREATE TABLE public.garden_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot integer NOT NULL,
  seed text NOT NULL,
  planted_at timestamptz NOT NULL DEFAULT now(),
  last_watered_at timestamptz,
  UNIQUE (user_id, slot)
);
GRANT SELECT ON public.garden_plots TO authenticated;
GRANT ALL ON public.garden_plots TO service_role;
ALTER TABLE public.garden_plots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own garden read" ON public.garden_plots FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Parents read child garden" ON public.garden_plots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parent_child_links l WHERE l.parent_id = auth.uid() AND l.child_id = garden_plots.user_id));

-- seed: days to grow, reward stars
CREATE OR REPLACE FUNCTION public.garden_seed_info(_seed text, OUT days int, OUT reward int)
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _seed WHEN 'radish' THEN 1 WHEN 'carrot' THEN 2 WHEN 'tomato' THEN 3 WHEN 'sunflower' THEN 4 WHEN 'pumpkin' THEN 5 ELSE NULL END,
         CASE _seed WHEN 'radish' THEN 3 WHEN 'carrot' THEN 5 WHEN 'tomato' THEN 8 WHEN 'sunflower' THEN 11 WHEN 'pumpkin' THEN 15 ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.garden_plant(_slot int, _seed text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR _slot < 0 OR _slot > 5 OR (public.garden_seed_info(_seed)).days IS NULL THEN RETURN false; END IF;
  INSERT INTO public.garden_plots (user_id, slot, seed) VALUES (auth.uid(), _slot, _seed)
  ON CONFLICT (user_id, slot) DO NOTHING;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.garden_water(_slot int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  UPDATE public.garden_plots SET last_watered_at = now()
  WHERE user_id = auth.uid() AND slot = _slot
    AND (last_watered_at IS NULL OR last_watered_at::date < current_date);
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.garden_harvest(_slot int)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.garden_plots; i record;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  SELECT * INTO p FROM public.garden_plots WHERE user_id = auth.uid() AND slot = _slot FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT * INTO i FROM public.garden_seed_info(p.seed);
  IF p.planted_at + make_interval(days => i.days) > now() THEN RETURN 0; END IF;
  DELETE FROM public.garden_plots WHERE id = p.id;
  UPDATE public.user_progress SET stars = stars + i.reward WHERE user_id = auth.uid();
  RETURN i.reward;
END; $$;

REVOKE ALL ON FUNCTION public.garden_plant(int, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.garden_water(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.garden_harvest(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.garden_plant(int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_water(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.garden_harvest(int) TO authenticated;