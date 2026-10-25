CREATE TABLE public.learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  item text NOT NULL,
  times_correct int NOT NULL DEFAULT 1,
  first_learned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, subject, item)
);
GRANT SELECT ON public.learning_progress TO authenticated;
GRANT ALL ON public.learning_progress TO service_role;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Child or linked parent reads learning progress" ON public.learning_progress FOR SELECT TO authenticated
  USING (child_id = auth.uid() OR EXISTS (SELECT 1 FROM public.parent_child_links l WHERE l.parent_id = auth.uid() AND l.child_id = learning_progress.child_id));

CREATE OR REPLACE FUNCTION public.mark_learned(_subject text, _item text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR length(_item) > 60 OR _subject NOT IN ('alphabet','tales','english','reading') THEN RETURN; END IF;
  INSERT INTO public.learning_progress (child_id, subject, item)
  VALUES (auth.uid(), _subject, _item)
  ON CONFLICT (child_id, subject, item) DO UPDATE
    SET times_correct = learning_progress.times_correct + 1, updated_at = now();
END; $$;
REVOKE ALL ON FUNCTION public.mark_learned(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_learned(text,text) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_progress;