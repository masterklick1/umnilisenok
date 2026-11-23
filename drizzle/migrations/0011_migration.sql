REVOKE SELECT ON public.manual_payments FROM authenticated;
GRANT SELECT (id, user_id, amount, status, created_at, approved_at) ON public.manual_payments TO authenticated;