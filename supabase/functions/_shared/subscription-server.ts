import { Environment, Paddle } from 'npm:@paddle/paddle-node-sdk@3.12.0';
import { billingDatabase, requiredEnv } from './paddle.ts';
import { entitlementKeys, grantedTier } from './subscription-catalog.ts';

export function subscriptionConfig() {
  if (requiredEnv('PADDLE_SUBSCRIPTIONS_ENVIRONMENT') !== 'sandbox') {
    throw new Error('Subscriptions are sandbox-only until the go-live migration passes testing');
  }
  return { environment: 'sandbox' as const };
}

export function subscriptionPaddle() {
  subscriptionConfig();
  const key = requiredEnv('PADDLE_SANDBOX_API_KEY');
  if (!key.startsWith('pdl_sdbx_apikey_')) throw new Error('A sandbox API key is required');
  return new Paddle(key, { environment: Environment.sandbox });
}

export async function subscriptionAccess(database: ReturnType<typeof billingDatabase>, customerId: string) {
  const { data, error } = await database.from('paddle_subscriptions')
    .select('subscription_id,status,price_id,product_id,scheduled_change_action,scheduled_change_at,paddle_created_at')
    .eq('environment', subscriptionConfig().environment).eq('customer_id', customerId)
    .order('paddle_created_at', { ascending: false });
  if (error) throw error;
  const tier = grantedTier(data);
  return { paid: tier !== null, tier, entitlements: entitlementKeys(tier), subscriptions: data };
}
