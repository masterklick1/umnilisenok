CREATE TABLE public.parent_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'idea',
  message text NOT NULL,
  contact_email text,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.parent_feedback TO authenticated;
GRANT ALL ON public.parent_feedback TO service_role;

ALTER TABLE public.parent_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
ON public.parent_feedback FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND length(message) BETWEEN 3 AND 2000);

CREATE POLICY "Users can read their own feedback"
ON public.parent_feedback FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_parent_feedback_created_at ON public.parent_feedback (created_at DESC);