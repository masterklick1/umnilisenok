CREATE OR REPLACE FUNCTION public.link_parent_child(p_parent_id uuid, p_child_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.parent_child_links (parent_id, child_id)
  VALUES (p_parent_id, p_child_id);
END;
$$;