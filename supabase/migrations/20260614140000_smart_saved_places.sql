-- Saved places per child (school, home, etc.) with individual radius
CREATE TABLE IF NOT EXISTS public.child_saved_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  place_key text NOT NULL DEFAULT 'custom',
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '📍',
  address text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_m integer NOT NULL DEFAULT 150 CHECK (radius_m >= 30 AND radius_m <= 5000),
  notify_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, place_key)
);

CREATE INDEX IF NOT EXISTS idx_child_saved_places_child ON public.child_saved_places (child_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_saved_places TO authenticated;
GRANT ALL ON public.child_saved_places TO service_role;

ALTER TABLE public.child_saved_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parent manages linked child places"
  ON public.child_saved_places FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.parent_id = auth.uid() AND pcl.child_id = child_saved_places.child_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.parent_id = auth.uid() AND pcl.child_id = child_saved_places.child_id
    )
  );

CREATE POLICY "Child reads own places"
  ON public.child_saved_places FOR SELECT TO authenticated
  USING (auth.uid() = child_id);

-- Live status: where child is now / going home
CREATE TABLE IF NOT EXISTS public.child_place_status (
  child_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_place_id uuid REFERENCES public.child_saved_places(id) ON DELETE SET NULL,
  current_place_name text,
  status text NOT NULL DEFAULT 'unknown',
  target_place_id uuid REFERENCES public.child_saved_places(id) ON DELETE SET NULL,
  target_place_name text,
  status_message text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.child_place_status TO authenticated;
GRANT ALL ON public.child_place_status TO service_role;

ALTER TABLE public.child_place_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Child writes own place status"
  ON public.child_place_status FOR ALL TO authenticated
  USING (auth.uid() = child_id)
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Parent reads linked child place status"
  ON public.child_place_status FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.parent_id = auth.uid() AND pcl.child_id = child_place_status.child_id
    )
  );

-- Extend geofence events with place info
ALTER TABLE public.geofence_events
  ADD COLUMN IF NOT EXISTS place_id uuid REFERENCES public.child_saved_places(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS place_name text,
  ADD COLUMN IF NOT EXISTS status_hint text;

ALTER PUBLICATION supabase_realtime ADD TABLE public.child_saved_places;
ALTER PUBLICATION supabase_realtime ADD TABLE public.child_place_status;
ALTER TABLE public.child_saved_places REPLICA IDENTITY FULL;
ALTER TABLE public.child_place_status REPLICA IDENTITY FULL;
