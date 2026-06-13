-- Fix redeem_child_invite: profile row may lag behind auth.users right after signUp
CREATE OR REPLACE FUNCTION public.redeem_child_invite(p_code text, p_child_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_child_id THEN
    RAISE EXCEPTION 'Not authorized to redeem invite for this user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_child_id) THEN
    RAISE EXCEPTION 'Invalid child account';
  END IF;

  IF EXISTS (SELECT 1 FROM public.parent_child_links WHERE child_id = p_child_id) THEN
    RAISE EXCEPTION 'Child is already linked to a parent';
  END IF;

  IF auth.uid() IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = p_child_id
        AND created_at > now() - interval '30 minutes'
    ) THEN
      RAISE EXCEPTION 'Invite must be redeemed during registration';
    END IF;
  END IF;

  SELECT parent_id INTO v_parent
  FROM public.child_invites
  WHERE code = upper(p_code)
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF v_parent IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  INSERT INTO public.parent_child_links (parent_id, child_id)
  VALUES (v_parent, p_child_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles SET role = 'child' WHERE id = p_child_id;

  UPDATE public.child_invites
  SET used_at = now(), child_id = p_child_id
  WHERE code = upper(p_code);
END;
$$;
