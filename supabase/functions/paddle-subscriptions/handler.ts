import { createClient } from 'npm:@supabase/supabase-js@2.84.0';
import { billingDatabase, requiredEnv } from '../_shared/paddle.ts';
import { subscriptionAccess, subscriptionConfig, subscriptionPaddle } from '../_shared/subscription-server.ts';
import { tierForPrice } from '../_shared/subscription-catalog.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const respond = (body: object, status = 200) => Response.json(body, {
  status, headers: { ...cors, 'Cache-Control': 'no-store' },
});

export function countryFromHeaders(headers: Headers): string | undefined {
  const value = (headers.get('x-vercel-ip-country') ?? headers.get('cf-ipcountry'))?.toUpperCase();
  return value && /^[A-Z]{2}$/.test(value) && !['XX', 'ZZ'].includes(value) ? value : undefined;
}

export async function handleSubscriptions(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405);
  try {
    const action = new URL(request.url).searchParams.get('action');
    if (action === 'config') {
      const config = subscriptionConfig();
      const token = requiredEnv('PADDLE_SANDBOX_CLIENT_TOKEN');
      if (!token.startsWith('test_')) throw new Error('A test_ client token is required');
      return respond({ environment: config.environment, token, country: countryFromHeaders(request.headers) });
    }
    // Authentication MUST precede DB queries and Paddle API calls.
    const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return respond({ error: 'unauthorized' }, 401);
    const auth = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError || !user?.email || user.is_anonymous) return respond({ error: 'unauthorized' }, 401);
    if (!['status', 'checkout', 'portal'].includes(action ?? '')) return respond({ error: 'unknown_action' }, 400);

    const config = subscriptionConfig();
    const database = billingDatabase();
    const { data: profile, error: profileError } = await database.from('profiles').select('role')
      .eq('id', user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== 'parent') return respond({ error: 'parent_account_required' }, 403);
    const { data: owner, error: ownerError } = await database.from('paddle_customers').select('customer_id')
      .eq('environment', config.environment).eq('user_id', user.id).maybeSingle();
    if (ownerError) throw ownerError;
    const access = owner ? await subscriptionAccess(database, owner.customer_id)
      : { paid: false, tier: null, entitlements: [], subscriptions: [] };
    if (action === 'status') return respond(access);

    const paddle = subscriptionPaddle();
    if (action === 'portal') {
      // A canceled customer may still need invoices and payment history.
      if (!owner) return respond({ error: 'no_billing_customer' }, 404);
      const session = await paddle.customerPortalSessions.create(owner.customer_id,
        access.subscriptions.slice(0, 25).map(sub => sub.subscription_id));
      return respond({ url: session.urls.general.overview });
    }

    const { priceId } = await request.json();
    if (typeof priceId !== 'string' || !tierForPrice(priceId)) return respond({ error: 'invalid_price' }, 400);
    if (access.subscriptions.some(sub => ['active', 'trialing', 'past_due', 'paused'].includes(sub.status))) {
      return respond({ error: 'manage_existing_subscription_in_portal' }, 409);
    }
    let customerId = owner?.customer_id;
    if (!customerId) {
      // Never attach ownership using client custom_data, customer IDs, or an email match.
      const customer = await paddle.customers.create({ email: user.email });
      const { error } = await database.rpc('record_paddle_customer', {
        p_environment: config.environment, p_customer_id: customer.id, p_email: customer.email,
        p_updated_at: customer.updatedAt, p_user_id: user.id,
      });
      if (error) throw error;
      customerId = customer.id;
    }
    const transaction = await paddle.transactions.create({ customerId, items: [{ priceId, quantity: 1 }] });
    return respond({ transactionId: transaction.id, priceId, email: user.email });
  } catch (error) {
    console.error('Sandbox subscription request failed', error instanceof Error ? error.message : 'request failed');
    return respond({ error: 'sandbox_billing_unavailable' }, 503);
  }
}
