// Sandbox IDs only. Do not replace the live one-time full-access offer with these.
export interface Tier {
  name: 'Starter' | 'Pro' | 'Advanced';
  description: string;
  features: string[];
  productId: string;
  priceId: { month: string; year: string };
}

export const subscriptionTiers: Tier[] = [
  {
    name: 'Starter', description: 'Начальный тариф',
    features: ['Уровень доступа Starter', '7 дней бесплатно'],
    productId: 'pro_01m897p7tr61rxn66ebp0dasq1',
    priceId: { month: 'pri_01m89807bk4806kmb8nb70312h', year: 'pri_01m8983653reqt4xj1ng6cjyjn' },
  },
  {
    name: 'Pro', description: 'Расширенный тариф',
    features: ['Уровни доступа Starter и Pro', '7 дней бесплатно'],
    productId: 'pro_01m89853jhpyb6nv96c37pc63b',
    priceId: { month: 'pri_01m8989f0adakmgdadrtd0y5td', year: 'pri_01m898bq0ttpkbgyvp37mwbd9g' },
  },
  {
    name: 'Advanced', description: 'Максимальный тариф',
    features: ['Все три уровня доступа', '7 дней бесплатно'],
    productId: 'pro_01m898cvm32xy0hc2x85011252',
    priceId: { month: 'pri_01m898fnr2z54hazvkc67n47sj', year: 'pri_01m898khnfp7mjkvrpke0xk8a5' },
  },
];

export function tierForPrice(priceId: string, productId?: string) {
  return subscriptionTiers.find(tier =>
    Object.values(tier.priceId).includes(priceId) && (!productId || tier.productId === productId));
}

// Scheduled changes deliberately do not participate in access checks.
// Default policy: paused and past_due deny access, active and trialing grant it.
export function grantedTier(subscriptions: { status: string; price_id: string; product_id: string }[]) {
  return [...subscriptionTiers].reverse().find(tier => subscriptions.some(sub =>
    ['active', 'trialing'].includes(sub.status) &&
    tierForPrice(sub.price_id, sub.product_id)?.name === tier.name))?.name ?? null;
}

export function entitlementKeys(tier: Tier['name'] | null) {
  const rank = subscriptionTiers.findIndex(entry => entry.name === tier);
  return rank < 0 ? [] : subscriptionTiers.slice(0, rank + 1).map(entry => `tier:${entry.name.toLowerCase()}`);
}
