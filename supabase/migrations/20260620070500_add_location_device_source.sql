ALTER TABLE public.child_locations
  ADD COLUMN IF NOT EXISTS device_source TEXT NOT NULL DEFAULT 'phone';

ALTER TABLE public.child_locations
  DROP CONSTRAINT IF EXISTS child_locations_device_source_check;

ALTER TABLE public.child_locations
  ADD CONSTRAINT child_locations_device_source_check
  CHECK (device_source IN ('phone', 'watch'));

CREATE INDEX IF NOT EXISTS idx_child_locations_child_source_time
  ON public.child_locations (child_id, device_source, created_at DESC);
