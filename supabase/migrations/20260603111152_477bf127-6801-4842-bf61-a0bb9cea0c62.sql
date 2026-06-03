
-- Allow parents to read their linked children's room items
CREATE POLICY "Parents can view children room items"
ON public.user_room_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_child_links pcl
    WHERE pcl.parent_id = auth.uid() AND pcl.child_id = user_room_items.user_id
  )
);

-- Allow parents to read their linked children's pets
CREATE POLICY "Parents can view children pets"
ON public.user_pets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_child_links pcl
    WHERE pcl.parent_id = auth.uid() AND pcl.child_id = user_pets.user_id
  )
);

-- Enable realtime
ALTER TABLE public.user_room_items REPLICA IDENTITY FULL;
ALTER TABLE public.user_pets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_room_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_pets;
