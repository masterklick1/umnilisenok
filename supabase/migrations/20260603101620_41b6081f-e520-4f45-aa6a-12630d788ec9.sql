-- Child uploads to their own folder: monitoring/<child_id>/<filename>
CREATE POLICY "Child uploads own monitoring"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'monitoring'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Child reads own monitoring"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'monitoring'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.parent_child_links pcl
        WHERE pcl.parent_id = auth.uid()
          AND pcl.child_id::text = (storage.foldername(name))[1]
      )
    )
  );