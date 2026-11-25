import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { supabase } from '@/integrations/supabase/client';
export { subscriptionTiers, type Tier } from '../../supabase/functions/_shared/subscription-catalog';

export interface SandboxConfig { environment: 'sandbox'; token: string; country?: string }
export interface SubscriptionStatus {
  paid: boolean;
  tier: 'Starter' | 'Pro' | 'Advanced' | null;
  entitlements: string[];
  subscriptions: { subscription_id: string; status: string; scheduled_change_action: string | null; scheduled_change_at: string | null }[];
}

export async function subscriptionRequest<T>(action: 'config' | 'status' | 'checkout' | 'portal', body?: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(`paddle-subscriptions?action=${action}`, { body });
  if (error) {
    const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? 'sandbox_billing_unavailable');
  }
  if (!data) throw new Error('Empty sandbox billing response');
  return data;
}

let instance: Promise<Paddle> | undefined;
export function getSandboxPaddle(config: SandboxConfig) {
  if (config.environment !== 'sandbox' || !config.token.startsWith('test_')) {
    throw new Error('Sandbox configuration must explicitly specify sandbox and a test_ token');
  }
  instance ??= initializePaddle({ environment: config.environment, token: config.token }).then(paddle => {
    if (!paddle) throw new Error('Paddle initialization failed');
    return paddle;
  }).catch(error => { instance = undefined; throw error; });
  return instance;
}
