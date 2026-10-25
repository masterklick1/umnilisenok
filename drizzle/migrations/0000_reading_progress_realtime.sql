ALTER PUBLICATION supabase_realtime ADD TABLE public.reading_progress;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;
GRANT ALL ON public.reading_progress TO service_role;