ALTER TABLE public.room_items ADD COLUMN IF NOT EXISTS unlock_subject text;
ALTER TABLE public.room_items ADD COLUMN IF NOT EXISTS unlock_count integer;

CREATE OR REPLACE FUNCTION public.learned_count(_subject text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _subject = 'reading' THEN
    (SELECT count(*) FROM public.reading_progress WHERE child_id = auth.uid())::int
    + (SELECT count(*) FROM public.learning_progress WHERE child_id = auth.uid() AND subject = 'reading')::int
  ELSE
    (SELECT count(*) FROM public.learning_progress WHERE child_id = auth.uid() AND subject = _subject)::int
  END
$$;

CREATE OR REPLACE FUNCTION public.claim_reward_item(_item_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _subj text; _need int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT unlock_subject, unlock_count INTO _subj, _need FROM public.room_items WHERE id = _item_id;
  IF _subj IS NULL OR _need IS NULL THEN RETURN false; END IF;
  IF public.learned_count(_subj) < _need THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_room_items WHERE user_id = auth.uid() AND item_id = _item_id) THEN
    RETURN true;
  END IF;
  INSERT INTO public.user_room_items (user_id, item_id) VALUES (auth.uid(), _item_id);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.learned_count(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_reward_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learned_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_reward_item(uuid) TO authenticated;