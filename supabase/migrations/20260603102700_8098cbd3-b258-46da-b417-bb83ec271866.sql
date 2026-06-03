CREATE TABLE public.child_settings (
  child_id uuid PRIMARY KEY,
  location_enabled boolean NOT NULL DEFAULT true,
  location_interval_seconds integer NOT NULL DEFAULT 60,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_settings TO authenticated;
GRANT ALL ON public.child_settings TO service_role;

ALTER TABLE public.child_settings ENABLE ROW LEVEL SECURITY;

-- Ребёнок читает/пишет свои настройки (нужно приложению)
CREATE POLICY "Child reads own settings"
ON public.child_settings FOR SELECT
TO authenticated
USING (
  auth.uid() = child_id
  OR EXISTS (
    SELECT 1 FROM public.parent_child_links pcl
    WHERE pcl.parent_id = auth.uid() AND pcl.child_id = child_settings.child_id
  )
);

CREATE POLICY "Child inserts own settings"
ON public.child_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Parent inserts linked child settings"
ON public.child_settings FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.parent_child_links pcl
  WHERE pcl.parent_id = auth.uid() AND pcl.child_id = child_settings.child_id
));

CREATE POLICY "Child updates own settings"
ON public.child_settings FOR UPDATE
TO authenticated
USING (auth.uid() = child_id);

CREATE POLICY "Parent updates linked child settings"
ON public.child_settings FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.parent_child_links pcl
  WHERE pcl.parent_id = auth.uid() AND pcl.child_id = child_settings.child_id
));

-- Realtime, чтобы устройство ребёнка мгновенно подхватывало смену интервала
ALTER PUBLICATION supabase_realtime ADD TABLE public.child_settings;
ALTER TABLE public.child_settings REPLICA IDENTITY FULL;