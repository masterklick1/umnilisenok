-- Additive migration. Existing live customers/purchases remain unchanged.
-- Requires 20261116083333_paddle_full_access.sql (already part of this project).
BEGIN;

CREATE TABLE public.paddle_subscriptions (
  environment text NOT NULL CHECK (environment IN ('live', 'sandbox')),
  subscription_id text NOT NULL,
  customer_id text NOT NULL,
  status text NOT NULL,
  price_id text NOT NULL,
  product_id text NOT NULL,
  items jsonb NOT NULL,
  scheduled_change_action text,
  scheduled_change_at timestamptz,
  paddle_created_at timestamptz NOT NULL,
  last_event_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, subscription_id),
  FOREIGN KEY (environment, customer_id) REFERENCES public.paddle_customers(environment, customer_id)
);
CREATE INDEX paddle_subscriptions_customer_idx ON public.paddle_subscriptions(environment, customer_id);

CREATE TABLE public.paddle_subscription_transactions (
  environment text NOT NULL CHECK (environment IN ('live', 'sandbox')),
  transaction_id text NOT NULL,
  customer_id text NOT NULL,
  subscription_id text,
  status text NOT NULL,
  items jsonb NOT NULL,
  last_event_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, transaction_id),
  FOREIGN KEY (environment, customer_id) REFERENCES public.paddle_customers(environment, customer_id)
  -- No subscription FK: transaction.completed may arrive before subscription.created.
);

ALTER TABLE public.paddle_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paddle_subscription_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.paddle_subscriptions, public.paddle_subscription_transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.paddle_subscriptions, public.paddle_subscription_transactions TO service_role;

CREATE FUNCTION public.record_paddle_subscription(p_environment text, p_event_at timestamptz, p_data jsonb)
RETURNS void LANGUAGE sql SET search_path = '' AS $$
  INSERT INTO public.paddle_subscriptions AS existing (
    environment, subscription_id, customer_id, status, price_id, product_id, items,
    scheduled_change_action, scheduled_change_at, paddle_created_at, last_event_at
  ) VALUES (
    p_environment, p_data->>'id', p_data->>'customerId', p_data->>'status',
    COALESCE(p_data->>'priceId', ''), COALESCE(p_data->>'productId', ''), p_data->'items',
    p_data->>'scheduledChangeAction', (p_data->>'scheduledChangeAt')::timestamptz,
    (p_data->>'createdAt')::timestamptz, p_event_at
  ) ON CONFLICT (environment, subscription_id) DO UPDATE SET
    status = EXCLUDED.status, price_id = EXCLUDED.price_id,
    product_id = EXCLUDED.product_id, items = EXCLUDED.items,
    scheduled_change_action = EXCLUDED.scheduled_change_action,
    scheduled_change_at = EXCLUDED.scheduled_change_at,
    last_event_at = EXCLUDED.last_event_at, updated_at = now()
  WHERE existing.last_event_at < EXCLUDED.last_event_at
    AND existing.customer_id = EXCLUDED.customer_id;
$$;

CREATE FUNCTION public.record_paddle_subscription_transaction(p_environment text, p_event_at timestamptz, p_data jsonb)
RETURNS void LANGUAGE sql SET search_path = '' AS $$
  INSERT INTO public.paddle_subscription_transactions AS existing (
    environment, transaction_id, customer_id, subscription_id, status, items, last_event_at
  ) VALUES (
    p_environment, p_data->>'id', p_data->>'customerId', p_data->>'subscriptionId',
    p_data->>'status', p_data->'items', p_event_at
  ) ON CONFLICT (environment, transaction_id) DO UPDATE SET
    status = EXCLUDED.status, subscription_id = EXCLUDED.subscription_id,
    items = EXCLUDED.items, last_event_at = EXCLUDED.last_event_at
  WHERE existing.last_event_at < EXCLUDED.last_event_at
    AND existing.customer_id = EXCLUDED.customer_id;
$$;

REVOKE ALL ON FUNCTION public.record_paddle_subscription(text, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_paddle_subscription_transaction(text, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_paddle_subscription(text, timestamptz, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_paddle_subscription_transaction(text, timestamptz, jsonb) TO service_role;
COMMIT;
