CREATE TABLE public.manual_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  amount text NOT NULL DEFAULT '10 TJS',
  status text NOT NULL DEFAULT 'pending',
  approve_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);
CREATE INDEX manual_payments_user_idx ON public.manual_payments(user_id);
GRANT SELECT ON public.manual_payments TO authenticated;
GRANT ALL ON public.manual_payments TO service_role;
ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own manual payments" ON public.manual_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);