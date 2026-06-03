-- Таблица одноразовых кодов-приглашений для привязки детского устройства
CREATE TABLE public.child_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  parent_id uuid NOT NULL,
  child_first_name text NOT NULL,
  child_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamptz
);

CREATE INDEX idx_child_invites_code ON public.child_invites(code);
CREATE INDEX idx_child_invites_parent ON public.child_invites(parent_id);

GRANT SELECT ON public.child_invites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_invites TO authenticated;
GRANT ALL ON public.child_invites TO service_role;

ALTER TABLE public.child_invites ENABLE ROW LEVEL SECURITY;

-- Родитель видит свои приглашения
CREATE POLICY "Parents view own invites"
ON public.child_invites FOR SELECT
TO authenticated
USING (auth.uid() = parent_id);

-- Родитель создаёт приглашения на себя
CREATE POLICY "Parents create invites"
ON public.child_invites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = parent_id);

-- Родитель может удалить/обновить своё приглашение
CREATE POLICY "Parents manage own invites"
ON public.child_invites FOR UPDATE
TO authenticated
USING (auth.uid() = parent_id);

CREATE POLICY "Parents delete own invites"
ON public.child_invites FOR DELETE
TO authenticated
USING (auth.uid() = parent_id);

-- Аноним может проверить код (для экрана /join)
CREATE POLICY "Anyone can lookup valid invite by code"
ON public.child_invites FOR SELECT
TO anon
USING (used_at IS NULL AND expires_at > now());

-- Функция: получить данные приглашения по коду (для предзаполнения формы)
CREATE OR REPLACE FUNCTION public.get_invite_by_code(p_code text)
RETURNS TABLE(parent_id uuid, child_first_name text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT parent_id, child_first_name, expires_at
  FROM public.child_invites
  WHERE code = upper(p_code)
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;
$$;

-- Функция: погасить приглашение (вызывается после signup ребёнка)
CREATE OR REPLACE FUNCTION public.redeem_child_invite(p_code text, p_child_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_parent uuid;
BEGIN
  SELECT parent_id INTO v_parent
  FROM public.child_invites
  WHERE code = upper(p_code)
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF v_parent IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Связываем родителя и ребёнка
  INSERT INTO public.parent_child_links (parent_id, child_id)
  VALUES (v_parent, p_child_id)
  ON CONFLICT DO NOTHING;

  -- Помечаем профиль как child
  UPDATE public.profiles SET role = 'child' WHERE id = p_child_id;

  -- Гасим код
  UPDATE public.child_invites
  SET used_at = now(), child_id = p_child_id
  WHERE code = upper(p_code);
END;
$$;