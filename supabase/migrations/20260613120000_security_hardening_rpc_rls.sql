-- Harden SECURITY DEFINER RPCs and add missing RLS policies

-- link_parent_child: caller must be the parent
CREATE OR REPLACE FUNCTION public.link_parent_child(p_parent_id uuid, p_child_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_parent_id THEN
    RAISE EXCEPTION 'Not authorized to link children for this parent';
  END IF;

  IF p_parent_id = p_child_id THEN
    RAISE EXCEPTION 'Parent and child must be different users';
  END IF;

  INSERT INTO public.parent_child_links (parent_id, child_id)
  VALUES (p_parent_id, p_child_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- get_children_with_progress: caller must be the parent
CREATE OR REPLACE FUNCTION public.get_children_with_progress(p_parent_id uuid)
RETURNS TABLE (
  child_id uuid,
  first_name text,
  avatar_url text,
  stars integer,
  level integer,
  experience integer,
  daily_streak integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS child_id,
    p.first_name,
    p.avatar_url,
    COALESCE(up.stars, 0) AS stars,
    COALESCE(up.level, 1) AS level,
    COALESCE(up.experience, 0) AS experience,
    COALESCE(up.daily_streak, 0) AS daily_streak
  FROM parent_child_links pcl
  JOIN profiles p ON p.id = pcl.child_id
  LEFT JOIN user_progress up ON up.user_id = p.id
  WHERE pcl.parent_id = p_parent_id
    AND auth.uid() = p_parent_id;
$$;

-- redeem_child_invite: prevent hijacking invite codes
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

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_child_id) THEN
    RAISE EXCEPTION 'Invalid child account';
  END IF;

  IF EXISTS (SELECT 1 FROM public.parent_child_links WHERE child_id = p_child_id) THEN
    RAISE EXCEPTION 'Child is already linked to a parent';
  END IF;

  -- Allow unauthenticated redeem only for freshly created accounts (signup flow)
  IF auth.uid() IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
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

-- push_subscriptions: allow upsert updates for own rows
CREATE POLICY "User updates own push subs"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- monitoring storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('monitoring', 'monitoring', false)
ON CONFLICT (id) DO NOTHING;
