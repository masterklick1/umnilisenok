-- Set role from signup metadata (child invite flow)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := CASE
    WHEN coalesce(new.raw_user_meta_data->>'role', '') = 'child' THEN 'child'::public.user_role
    ELSE 'parent'::public.user_role
  END;

  INSERT INTO public.profiles (id, email, first_name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    v_role
  );

  INSERT INTO public.user_progress (user_id)
  VALUES (new.id);

  RETURN new;
END;
$$;

-- Child can confirm they are linked (for diagnostics; optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parent_child_links'
      AND policyname = 'Children can view own link'
  ) THEN
    CREATE POLICY "Children can view own link"
      ON public.parent_child_links FOR SELECT TO authenticated
      USING (auth.uid() = child_id);
  END IF;
END $$;
