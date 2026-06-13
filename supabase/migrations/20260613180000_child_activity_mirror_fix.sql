-- Reliable activity logging (child on own phone + parent "play here" mode)
-- and parent fetch for mirror feed

CREATE OR REPLACE FUNCTION public.log_child_activity(
  p_child_id uuid,
  p_activity_type text,
  p_page_path text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() = p_child_id THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM public.parent_child_links
    WHERE parent_id = auth.uid() AND child_id = p_child_id
  ) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Not authorized to log activity for this child';
  END IF;

  INSERT INTO public.child_activity (child_id, activity_type, page_path, details)
  VALUES (p_child_id, p_activity_type, p_page_path, p_details)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_child_activities(
  p_child_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS SETOF public.child_activity
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ca.*
  FROM public.child_activity ca
  WHERE ca.child_id = p_child_id
    AND EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.parent_id = auth.uid() AND pcl.child_id = p_child_id
    )
  ORDER BY ca.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$$;

REVOKE EXECUTE ON FUNCTION public.log_child_activity(uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_child_activity(uuid, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_child_activities(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_child_activities(uuid, integer) TO authenticated;
