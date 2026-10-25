DROP POLICY IF EXISTS "Anyone can view pets" ON public.pets;
CREATE POLICY "Signed-in users can view pets" ON public.pets FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view room items" ON public.room_items;
CREATE POLICY "Signed-in users can view room items" ON public.room_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
CREATE POLICY "Signed-in users can view achievements" ON public.achievements FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);