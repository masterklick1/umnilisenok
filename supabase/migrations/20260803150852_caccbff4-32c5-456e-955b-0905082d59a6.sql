-- 1. backup_child_locations: enable RLS + policies
ALTER TABLE public.backup_child_locations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.backup_child_locations TO authenticated;
GRANT ALL ON public.backup_child_locations TO service_role;

CREATE POLICY "Child can view own backup locations"
ON public.backup_child_locations
FOR SELECT
TO authenticated
USING (auth.uid() = child_id);

CREATE POLICY "Parents can view linked child backup locations"
ON public.backup_child_locations
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.parent_child_links pcl
  WHERE pcl.child_id = backup_child_locations.child_id
    AND pcl.parent_id = auth.uid()
));

-- 2. child_saved_places: add missing policies
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_saved_places TO authenticated;
GRANT ALL ON public.child_saved_places TO service_role;

CREATE POLICY "Child can view own saved places"
ON public.child_saved_places
FOR SELECT
TO authenticated
USING (auth.uid() = child_id);

CREATE POLICY "Parents can view linked child saved places"
ON public.child_saved_places
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.parent_child_links pcl
  WHERE pcl.child_id = child_saved_places.child_id
    AND pcl.parent_id = auth.uid()
));

CREATE POLICY "Parents can insert saved places for linked child"
ON public.child_saved_places
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = child_id
  OR EXISTS (
    SELECT 1 FROM public.parent_child_links pcl
    WHERE pcl.child_id = child_saved_places.child_id
      AND pcl.parent_id = auth.uid()
  )
);

CREATE POLICY "Parents can update saved places for linked child"
ON public.child_saved_places
FOR UPDATE
TO authenticated
USING (
  auth.uid() = child_id
  OR EXISTS (
    SELECT 1 FROM public.parent_child_links pcl
    WHERE pcl.child_id = child_saved_places.child_id
      AND pcl.parent_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = child_id
  OR EXISTS (
    SELECT 1 FROM public.parent_child_links pcl
    WHERE pcl.child_id = child_saved_places.child_id
      AND pcl.parent_id = auth.uid()
  )
);

CREATE POLICY "Parents can delete saved places for linked child"
ON public.child_saved_places
FOR DELETE
TO authenticated
USING (
  auth.uid() = child_id
  OR EXISTS (
    SELECT 1 FROM public.parent_child_links pcl
    WHERE pcl.child_id = child_saved_places.child_id
      AND pcl.parent_id = auth.uid()
  )
);

-- 3. Server-side parent PIN storage (hash only, never readable by clients)
CREATE TABLE public.parent_pins (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.parent_pins TO service_role;

ALTER TABLE public.parent_pins ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: table is only reachable through the
-- security definer functions below, so the hash can never be read by clients.

CREATE TRIGGER update_parent_pins_updated_at
BEFORE UPDATE ON public.parent_pins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_parent_pin(p_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_hash IS NULL OR length(p_hash) < 32 OR length(p_hash) > 256 THEN
    RAISE EXCEPTION 'Invalid pin hash';
  END IF;

  INSERT INTO public.parent_pins (user_id, pin_hash)
  VALUES (auth.uid(), p_hash)
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_parent_pin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM public.parent_pins WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.has_parent_pin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_pins
    WHERE user_id = auth.uid() AND auth.uid() IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.verify_parent_pin(p_hash text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT pin_hash INTO v_hash FROM public.parent_pins WHERE user_id = auth.uid();
  IF v_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_hash = p_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.set_parent_pin(text) FROM anon;
REVOKE ALL ON FUNCTION public.clear_parent_pin() FROM anon;
REVOKE ALL ON FUNCTION public.verify_parent_pin(text) FROM anon;
REVOKE ALL ON FUNCTION public.has_parent_pin() FROM anon;

GRANT EXECUTE ON FUNCTION public.set_parent_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_parent_pin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_parent_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_parent_pin() TO authenticated;