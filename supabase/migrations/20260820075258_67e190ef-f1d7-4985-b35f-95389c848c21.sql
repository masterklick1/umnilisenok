CREATE TABLE public.reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level integer NOT NULL,
  lesson_index integer NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  stars_earned integer NOT NULL DEFAULT 1,
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (child_id, level, lesson_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;
GRANT ALL ON public.reading_progress TO service_role;

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can manage their own reading progress"
  ON public.reading_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = child_id)
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Parents can view linked children's reading progress"
  ON public.reading_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links
      WHERE parent_id = auth.uid() AND child_id = reading_progress.child_id
    )
  );

INSERT INTO public.achievements (title, description, category, icon, reward_stars, requirement_type, requirement_value)
VALUES
  ('Первый слог', 'Прочитал первый слог', 'reading', '✏️', 5, 'count', 1),
  ('10 слов', 'Прочитал 10 слов', 'reading', '📖', 10, 'count', 10),
  ('Юный читатель', 'Прочитал 30 слов', 'reading', '🎓', 20, 'count', 30);