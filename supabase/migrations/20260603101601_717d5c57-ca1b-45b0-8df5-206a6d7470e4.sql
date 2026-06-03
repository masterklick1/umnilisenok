-- 1. Геолокация ребёнка
CREATE TABLE public.child_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  battery_level INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_child_locations_child_time ON public.child_locations (child_id, created_at DESC);

GRANT SELECT, INSERT ON public.child_locations TO authenticated;
GRANT ALL ON public.child_locations TO service_role;

ALTER TABLE public.child_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children write own locations"
  ON public.child_locations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Parents read linked child locations"
  ON public.child_locations FOR SELECT TO authenticated
  USING (
    auth.uid() = child_id
    OR EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.parent_id = auth.uid() AND pcl.child_id = child_locations.child_id
    )
  );

-- 2. SOS сигналы
CREATE TABLE public.sos_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sos_alerts_child_time ON public.sos_alerts (child_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.sos_alerts TO authenticated;
GRANT ALL ON public.sos_alerts TO service_role;

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children create own SOS"
  ON public.sos_alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Parents and child read SOS"
  ON public.sos_alerts FOR SELECT TO authenticated
  USING (
    auth.uid() = child_id
    OR EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.parent_id = auth.uid() AND pcl.child_id = sos_alerts.child_id
    )
  );

CREATE POLICY "Parents resolve SOS"
  ON public.sos_alerts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.parent_id = auth.uid() AND pcl.child_id = sos_alerts.child_id
    )
  );

-- 3. Запросы мониторинга (родитель -> ребёнок: сделай фото / запиши звук)
CREATE TABLE public.monitoring_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  child_id UUID NOT NULL,
  request_type TEXT NOT NULL, -- 'photo' | 'audio' | 'location'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'fulfilled' | 'failed' | 'denied'
  result_path TEXT,
  result_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_monitoring_child_status ON public.monitoring_requests (child_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.monitoring_requests TO authenticated;
GRANT ALL ON public.monitoring_requests TO service_role;

ALTER TABLE public.monitoring_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents create requests for linked children"
  ON public.monitoring_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = parent_id
    AND EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.parent_id = auth.uid() AND pcl.child_id = monitoring_requests.child_id
    )
  );

CREATE POLICY "Parent and child read requests"
  ON public.monitoring_requests FOR SELECT TO authenticated
  USING (auth.uid() = parent_id OR auth.uid() = child_id);

CREATE POLICY "Parent and child update requests"
  ON public.monitoring_requests FOR UPDATE TO authenticated
  USING (auth.uid() = parent_id OR auth.uid() = child_id);

-- 4. Включаем realtime для SOS и запросов
ALTER TABLE public.sos_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.monitoring_requests REPLICA IDENTITY FULL;
ALTER TABLE public.child_locations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='sos_alerts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='monitoring_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.monitoring_requests;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='child_locations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.child_locations;
  END IF;
END $$;