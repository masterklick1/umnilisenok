CREATE TABLE public.paddle_customers (
  environment text NOT NULL CHECK (environment IN ('live', 'sandbox')),
  customer_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  paddle_updated_at timestamptz NOT NULL,
  PRIMARY KEY (environment, customer_id),
  UNIQUE (environment, user_id)
);

CREATE TABLE public.paddle_purchases (
  environment text NOT NULL,
  transaction_id text NOT NULL,
  customer_id text NOT NULL,
  price_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (environment, transaction_id),
  FOREIGN KEY (environment, customer_id)
    REFERENCES public.paddle_customers (environment, customer_id)
);

CREATE INDEX paddle_completed_purchases_customer_idx
  ON public.paddle_purchases (environment, customer_id, price_id)
  WHERE completed_at IS NOT NULL;

ALTER TABLE public.paddle_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paddle_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.paddle_customers, public.paddle_purchases FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.paddle_customers, public.paddle_purchases TO service_role;

CREATE FUNCTION public.record_paddle_customer(
  p_environment text, p_customer_id text, p_email text, p_updated_at timestamptz,
  p_user_id uuid DEFAULT NULL
) RETURNS void LANGUAGE sql SET search_path = '' AS $$
  INSERT INTO public.paddle_customers AS existing
    (environment, customer_id, email, paddle_updated_at, user_id)
  VALUES (p_environment, p_customer_id, p_email, p_updated_at, p_user_id)
  ON CONFLICT (environment, customer_id) DO UPDATE SET
    email = CASE WHEN excluded.paddle_updated_at > existing.paddle_updated_at
      THEN excluded.email ELSE existing.email END,
    paddle_updated_at = greatest(existing.paddle_updated_at, excluded.paddle_updated_at),
    user_id = coalesce(existing.user_id, excluded.user_id)
  WHERE excluded.paddle_updated_at > existing.paddle_updated_at
    OR (existing.user_id IS NULL AND excluded.user_id IS NOT NULL);
$$;

REVOKE ALL ON FUNCTION public.record_paddle_customer(text, text, text, timestamptz, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_paddle_customer(text, text, text, timestamptz, uuid)
  TO service_role;
