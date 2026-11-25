import { strict as assert } from 'node:assert';
import { entitlementKeys, grantedTier, subscriptionTiers } from './subscription-catalog.ts';
import { countryFromHeaders, handleSubscriptions } from '../paddle-subscriptions/handler.ts';
import { handleSubscriptionWebhook } from '../paddle-subscriptions-webhook/handler.ts';

Deno.test('access follows actual status; scheduled cancellation preserves trial access', () => {
  const tier = subscriptionTiers[1];
  const sub = { status: 'trialing', price_id: tier.priceId.month, product_id: tier.productId,
    scheduled_change_action: 'cancel' };
  assert.equal(grantedTier([sub]), 'Pro');
  assert.deepEqual(entitlementKeys(grantedTier([sub])), ['tier:starter', 'tier:pro']);
  for (const status of ['canceled', 'paused', 'past_due']) assert.equal(grantedTier([{ ...sub, status }]), null);
  assert.equal(grantedTier([{ ...sub, product_id: 'unrecognized' }]), null);
});

Deno.test('missing/unknown country is omitted rather than forwarded to Paddle', () => {
  assert.equal(countryFromHeaders(new Headers()), undefined);
  for (const value of ['OTHERS', 'XX', 'ZZ', 'T1']) {
    assert.equal(countryFromHeaders(new Headers({ 'cf-ipcountry': value })), undefined);
  }
  assert.equal(countryFromHeaders(new Headers({ 'x-vercel-ip-country': 'GB' })), 'GB');
});

Deno.test('anonymous portal cannot mint a customer session', async () => {
  const response = await handleSubscriptions(new Request('https://example.com?action=portal', { method: 'POST' }));
  assert.equal(response.status, 401);
});

Deno.test('sandbox config fails closed when environment is missing or live', async () => {
  for (const environment of ['', 'live']) {
    Deno.env.set('PADDLE_SUBSCRIPTIONS_ENVIRONMENT', environment);
    const response = await handleSubscriptions(new Request('https://example.com?action=config', { method: 'POST' }));
    assert.equal(response.status, 503);
  }
});

Deno.test('raw webhook signature verified before writes; signed customer event preserves ownership', async () => {
  Deno.env.set('PADDLE_SUBSCRIPTIONS_ENVIRONMENT', 'sandbox');
  Deno.env.set('PADDLE_SANDBOX_API_KEY', 'pdl_sdbx_apikey_local_signature_test');
  Deno.env.set('PADDLE_SANDBOX_WEBHOOK_SECRET', 'local-signature-test');
  Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'local-service-role-test');
  const raw = JSON.stringify({ event_id: 'evt_local', event_type: 'customer.created', occurred_at: new Date().toISOString(),
    notification_id: 'ntf_local', data: {
      id: 'ctm_01m897p7tr61rxn66ebp0dasq1', email: 'signature-test@example.com', name: null,
      locale: 'en', status: 'active', custom_data: null, import_meta: null, marketing_consent: false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    } });
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('local-signature-test'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}:${raw}`));
  const signature = `ts=${timestamp};h1=${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}`;
  let writes = 0;
  const fetchBefore = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.ok(String(input).endsWith('/rest/v1/rpc/record_paddle_customer'));
    const body = JSON.parse(String(init?.body));
    assert.equal(body.p_environment, 'sandbox');
    assert.equal(body.p_user_id, undefined);
    writes++;
    return new Response('null', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const request = (body: string, header = signature) => new Request('https://example.com', {
      method: 'POST', headers: { 'Paddle-Signature': header }, body,
    });
    assert.equal((await handleSubscriptionWebhook(request(raw + ' '))).status, 400);
    assert.equal(writes, 0);
    assert.equal((await handleSubscriptionWebhook(request(raw))).status, 200);
    assert.equal(writes, 1);
    globalThis.fetch = async () => new Response('{"message":"database offline"}', { status: 500 });
    assert.equal((await handleSubscriptionWebhook(request(raw))).status, 500);
  } finally { globalThis.fetch = fetchBefore; }
});
