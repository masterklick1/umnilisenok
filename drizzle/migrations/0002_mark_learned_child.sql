CREATE OR REPLACE FUNCTION public.mark_learned_for(_child_id uuid, _subject text, _item text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR _child_id IS NULL OR length(_item) > 60 OR _subject NOT IN ('alphabet','tales','english','reading') THEN RETURN; END IF;
  IF _child_id <> auth.uid() AND NOT EXISTS (SELECT 1 FROM public.parent_child_links l WHERE l.parent_id = auth.uid() AND l.child_id = _child_id) THEN RETURN; END IF;
  INSERT INTO public.learning_progress (child_id, subject, item)
  VALUES (_child_id, _subject, _item)
  ON CONFLICT (child_id, subject, item) DO UPDATE
    SET times_correct = learning_progress.times_correct + 1, updated_at = now();
END; $$;
REVOKE ALL ON FUNCTION public.mark_learned_for(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_learned_for(uuid,text,text) TO authenticated;