
-- 1. child_invites: remove broad anon SELECT policy
DROP POLICY IF EXISTS "Anyone can lookup valid invite by code" ON public.child_invites;

-- 2. child_analysis: drop permissive writes (writes happen via service role in edge function)
DROP POLICY IF EXISTS "System can insert analysis" ON public.child_analysis;
DROP POLICY IF EXISTS "System can update analysis" ON public.child_analysis;

-- 3. Monitoring storage bucket: add UPDATE and DELETE policies scoped to child folder or linked parent
DROP POLICY IF EXISTS "Child updates own monitoring" ON storage.objects;
DROP POLICY IF EXISTS "Parents or child delete monitoring" ON storage.objects;

CREATE POLICY "Child updates own monitoring"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'monitoring'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'monitoring'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Parents or child delete monitoring"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'monitoring'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.parent_child_links pcl
      WHERE pcl.parent_id = auth.uid()
        AND (pcl.child_id)::text = (storage.foldername(storage.objects.name))[1]
    )
  )
);

-- 4. Lock down SECURITY DEFINER function EXECUTE grants
-- Trigger-only helpers: not callable via API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Parent-only helpers: authenticated only (drop anon)
REVOKE EXECUTE ON FUNCTION public.get_children_with_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_children_with_progress(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.link_parent_child(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_parent_child(uuid, uuid) TO authenticated;

-- Invite flow: needed by both anon (during child signup) and authenticated
REVOKE EXECUTE ON FUNCTION public.get_invite_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_by_code(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_child_invite(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_child_invite(text, uuid) TO anon, authenticated;
