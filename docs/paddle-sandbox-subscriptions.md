# Sandbox subscriptions: deployment and verification

Implementation prepared; hosted checkout/webhook/lifecycle tests have NOT passed yet.
Do not migrate to live until these checks pass. Existing live $1 full access is separate.

## Lovable Cloud setup

1. Inspect existing tables and apply `supabase/migrations/20261125130000_paddle_sandbox_subscriptions.sql`
   in Cloud SQL. Requires the existing `paddle_customers` schema and `record_paddle_customer`
   RPC from `20261116083333_paddle_full_access.sql`; stop if the actual schema differs.
   A Git commit alone does not execute this migration.
2. Add Cloud Secrets, preserving existing live `PADDLE_*` secrets:

   | Name | Value |
   |---|---|
   | `PADDLE_SUBSCRIPTIONS_ENVIRONMENT` | `sandbox` |
   | `PADDLE_SANDBOX_CLIENT_TOKEN` | public `test_…` token |
   | `PADDLE_SANDBOX_API_KEY` | secret `pdl_sdbx_apikey_…` key |
   | `PADDLE_SANDBOX_WEBHOOK_SECRET` | destination signing secret |

   Platform supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   API key permissions: customer read/write, transaction write, customer portal session write.
3. Deploy `paddle-subscriptions` and `paddle-subscriptions-webhook`, keeping their
   `verify_jwt=false` config. Customer actions verify Auth tokens inside the handler;
   the webhook uses Paddle signature verification. Publish the frontend.
4. **Paddle Sandbox → Events → Notifications**: create a persistent destination:
   - URL: `https://iekivmkxlpqwrfnakrbb.supabase.co/functions/v1/paddle-subscriptions-webhook`
   - Traffic: Both (platform and simulation).
   - Events: customer.created/updated; transaction.completed;
     subscription.created/updated/canceled/activated/trialing/paused/resumed/past_due.
   - Store its signing secret as `PADDLE_SANDBOX_WEBHOOK_SECRET`. Never delete the destination.
5. **Sandbox → Checkout → Checkout settings**: default payment link =
   `https://umnilisenok.lovable.app/sandbox/pricing`, after publishing the page.
   Paddle MCP is unavailable in this session; this setting must be set in the dashboard.
   Read payment methods, tax mode and balance currency there and record their current values.
   They have not been read or changed by this implementation.

## Routes and security

- `/sandbox/pricing`: editable tiers in `_shared/subscription-catalog.ts`. The browser gets
  environment/token/country from the public config endpoint. All six totals come from
  Paddle `formattedTotals.total`, without frontend price calculations or reformatting.
  Geo headers are read server-side. Missing/unknown codes are omitted; Paddle.js then uses
  the visitor's IP. If geo country is available, enter a billing postal code to prefill checkout.
  Changing billing address in Checkout can recalculate totals; its final total is authoritative.
- `/sandbox/billing`, `/welcome?billing=sandbox`: authenticated status + customer portal.
  Redirects cannot grant access. Owner mapping is created server-side before checkout;
  neither email matching nor client-supplied IDs/custom data can bind another customer.
- `subscriptionAccess` grants active/trialing tiers and cumulative `tier:starter`, `tier:pro`,
  `tier:advanced` keys. Pending cancel/pause does not revoke access. Default policy denies
  paused/past_due; change deliberately if a grace period is wanted. Test entitlements do
  not unlock the live app's one-time full access.
- Atomic SQL RPCs ignore duplicate/older events. Out-of-order customer notifications are
  handled by fetching the missing Paddle customer. Canceled customers retain portal access.

## Validation

```bash
npm ci
npm run build
npx tsc --noEmit -p tsconfig.app.json
npx deno test -A --no-lock --node-modules-dir=auto supabase/functions/_shared/subscription-sandbox.test.ts
npx deno run -A --no-lock --node-modules-dir=auto scripts/test-paddle-subscription-sql.ts
```

The SQL test uses disposable in-memory PGlite, never hosted data.

## Hosted end-to-end checklist — pending deployment

1. Verify explicit sandbox + `test_` config and SDK `Environment.sandbox`.
2. Sign in as a parent, toggle billing, compare preview/checkout prices. Complete a test
   checkout with 4242 4242 4242 4242, future expiry/CVC. Test decline separately with
   4000 0000 0000 0002. Confirm `/welcome?billing=sandbox` and mirrored tier/access.
   Free trials may initially collect no payment: confirm actual transaction state separately
   rather than describing a trial authorization as a paid recurring charge.
3. Events → Notifications: inspect every delivery and response (2xx required). Inspect function
   logs and fix/replay failures before proceeding. Exercise transaction.completed when the
   relevant transaction completes; simulation can additionally verify handler processing.
4. Confirm Cloud SQL state after each operation:

```sql
SELECT customer_id,user_id,email FROM public.paddle_customers WHERE environment='sandbox';
SELECT subscription_id,customer_id,status,price_id,product_id,
       scheduled_change_action,scheduled_change_at,last_event_at
FROM public.paddle_subscriptions WHERE environment='sandbox';
SELECT transaction_id,subscription_id,status,last_event_at
FROM public.paddle_subscription_transactions WHERE environment='sandbox';
```

5. Upgrade the real sandbox subscription immediately with `proration_billing_mode=do_not_bill`:
   verify updated tier/price/product and no charge. Schedule cancellation with
   `effective_from=next_billing_period`: trialing/active + pending change + access remains.
   Then cancel with `effective_from=immediately`: canceled + access denied.
   If necessary clear the existing scheduled change before immediate cancellation.
6. Verify portal sessions are freshly minted, unauthenticated calls are rejected, and
   canceled customers can still access invoices. Do not delete any persistent entity/row.

## Live gate

No live migration/deployment performed. After sandbox passes, confirm which catalog is
intended for the real product: existing $1 full access and three-tier subscriptions differ.
Prepare ID mapping (exclude the empty duplicate Pro), distinct live tokens/keys/destination,
Retain `pwCustomer` using the authenticated Paddle customer ID, approved domains/default
payment link, and dynamic IP allowlisting from Paddle live `/ips` using only platform-trusted
source-IP metadata. Audit current Paddle verification guidance, public policies, contact
details, product description and prices. No customer-facing live rollout before approval.
