CREATE TABLE public.parent_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_ids uuid[] NOT NULL,
  title text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz
);
GRANT SELECT ON public.parent_gifts TO authenticated;
GRANT ALL ON public.parent_gifts TO service_role;
ALTER TABLE public.parent_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gift read" ON public.parent_gifts FOR SELECT TO authenticated USING (child_id = auth.uid() OR parent_id = auth.uid());

CREATE TABLE public.garden_harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seed text NOT NULL,
  planted_at timestamptz NOT NULL,
  harvested_at timestamptz NOT NULL DEFAULT now(),
  stars integer NOT NULL
);
GRANT SELECT ON public.garden_harvests TO authenticated;
GRANT ALL ON public.garden_harvests TO service_role;
ALTER TABLE public.garden_harvests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own harvests" ON public.garden_harvests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Parents read harvests" ON public.garden_harvests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parent_child_links l WHERE l.parent_id = auth.uid() AND l.child_id = garden_harvests.user_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_gifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.garden_plots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.garden_harvests;

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
  INSERT INTO public.garden_harvests (user_id, seed, planted_at, stars) VALUES (auth.uid(), p.seed, p.planted_at, i.reward);
  UPDATE public.user_progress SET stars = stars + i.reward WHERE user_id = auth.uid();
  RETURN i.reward;
END; $$;

CREATE OR REPLACE FUNCTION public.send_parent_gift(_child_id uuid, _item_ids uuid[], _title text, _message text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM parent_child_links WHERE parent_id = auth.uid() AND child_id = _child_id) THEN RETURN false; END IF;
  IF _item_ids IS NULL OR array_length(_item_ids,1) IS NULL OR array_length(_item_ids,1) > 10 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM unnest(_item_ids) x WHERE NOT EXISTS (SELECT 1 FROM room_items r WHERE r.id = x)) THEN RETURN false; END IF;
  INSERT INTO parent_gifts (parent_id, child_id, item_ids, title, message)
  VALUES (auth.uid(), _child_id, _item_ids, left(coalesce(_title,'Подарок'),60), left(_message,200));
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.open_parent_gift(_gift_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g parent_gifts;
BEGIN
  SELECT * INTO g FROM parent_gifts WHERE id = _gift_id AND child_id = auth.uid() AND opened_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO user_room_items (user_id, item_id)
    SELECT auth.uid(), x FROM unnest(g.item_ids) x
    WHERE NOT EXISTS (SELECT 1 FROM user_room_items u WHERE u.user_id = auth.uid() AND u.item_id = x);
  UPDATE parent_gifts SET opened_at = now() WHERE id = g.id;
  RETURN true;
END; $$;

ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS unlock_achievement_id uuid REFERENCES public.achievements(id);

CREATE OR REPLACE FUNCTION public.claim_reward_item(_item_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _subj text; _need int; _ach uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT unlock_subject, unlock_count, unlock_achievement_id INTO _subj, _need, _ach FROM room_items WHERE id = _item_id;
  IF _ach IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = auth.uid() AND achievement_id = _ach) THEN RETURN false; END IF;
  ELSIF _subj IS NULL OR _need IS NULL OR public.learned_count(_subj) < _need THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM user_room_items WHERE user_id = auth.uid() AND item_id = _item_id) THEN
    INSERT INTO user_room_items (user_id, item_id) VALUES (auth.uid(), _item_id);
  END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.claim_reward_pet(_pet_id uuid, _name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ach uuid;
BEGIN
  IF auth.uid() IS NULL OR coalesce(trim(_name),'') = '' THEN RETURN false; END IF;
  SELECT unlock_achievement_id INTO _ach FROM pets WHERE id = _pet_id;
  IF _ach IS NULL OR NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = auth.uid() AND achievement_id = _ach) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM user_pets WHERE user_id = auth.uid() AND pet_id = _pet_id) THEN RETURN true; END IF;
  INSERT INTO user_pets (user_id, pet_id, pet_name, happiness, hunger, energy) VALUES (auth.uid(), _pet_id, left(trim(_name),20), 90, 90, 100);
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.send_parent_gift(uuid, uuid[], text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.open_parent_gift(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_reward_pet(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_parent_gift(uuid, uuid[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_parent_gift(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_reward_pet(uuid, text) TO authenticated;