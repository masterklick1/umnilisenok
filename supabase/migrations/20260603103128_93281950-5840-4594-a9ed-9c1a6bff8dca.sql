-- Geofence columns on child_settings
ALTER TABLE public.child_settings
  ADD COLUMN IF NOT EXISTS geofence_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geofence_lat double precision,
  ADD COLUMN IF NOT EXISTS geofence_lng double precision,
  ADD COLUMN IF NOT EXISTS geofence_radius_m integer NOT NULL DEFAULT 300;

-- Events table
CREATE TABLE IF NOT EXISTS public.geofence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('exit','enter')),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  distance_m double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.geofence_events TO authenticated;
GRANT ALL ON public.geofence_events TO service_role;

ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Child writes own geofence events"
  ON public.geofence_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Parent and child read geofence events"
  ON public.geofence_events FOR SELECT TO authenticated
  USING (
    auth.uid() = child_id
    OR EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.parent_id = auth.uid() AND pcl.child_id = geofence_events.child_id
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.geofence_events;
