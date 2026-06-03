ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone NOT NULL DEFAULT now();