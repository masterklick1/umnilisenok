import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { getSandboxPaddle, subscriptionRequest, subscriptionTiers, type SandboxConfig } from '@/lib/paddle-subscriptions';
import type { Paddle } from '@paddle/paddle-js';

export default function SandboxPricingPage() {
  const { user, loading, isDemo } = useAuth();
  const [frequency, setFrequency] = useState<'month' | 'year'>('month');
  const [offer, setOffer] = useState<{ paddle: Paddle; config: SandboxConfig; totals: Record<string, string> }>();
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const native = Capacitor.isNativePlatform();
  useEffect(() => {
    if (native) return;
    let active = true;
    void (async () => {
      try {
        const config = await subscriptionRequest<SandboxConfig>('config');
        const paddle = await getSandboxPaddle(config);
        const preview = await paddle.PricePreview({
          items: subscriptionTiers.flatMap(tier => Object.values(tier.priceId).map(priceId => ({ priceId, quantity: 1 }))),
          ...(config.country ? { address: { countryCode: config.country } } : {}),
        });
        const totals = Object.fromEntries(preview.data.details.lineItems.map(item => [item.price.id, item.formattedTotals.total]));
        if (Object.keys(totals).length !== 6) throw new Error('Paddle did not return all six prices');
        if (active) setOffer({ paddle, config, totals });
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Не удалось загрузить цены'); }
    })();
    return () => { active = false; };
  }, [native]);

  async function subscribe(priceId: string) {
    if (!offer || !user || isDemo || opening) return;
    setOpening(true); setError('');
    try {
      const transaction = await subscriptionRequest<{ transactionId: string; priceId: string; email: string }>('checkout', { priceId });
      if (transaction.priceId !== priceId || !/^txn_[a-z0-9]{26}$/.test(transaction.transactionId)) throw new Error('Checkout offer mismatch');
      offer.paddle.Checkout.open({
        transactionId: transaction.transactionId,
        customer: {
          email: transaction.email,
          ...(offer.config.country && postalCode.trim() ? {
            address: { countryCode: offer.config.country, postalCode: postalCode.trim() },
          } : {}),
        },
        settings: { displayMode: 'overlay', variant: 'one-page', allowLogout: false,
          successUrl: new URL('/welcome?billing=sandbox', window.location.origin).href },
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось открыть оплату'); }
    finally { setOpening(false); }
  }

  return <main className="min-h-screen bg-orange-50 px-5 py-12 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-8">
      <nav className="flex justify-between"><a href="/">← Умный лисёнок</a><a href="/sandbox/billing">Моя подписка →</a></nav>
      <header className="space-y-3 text-center"><p className="font-semibold text-orange-700">Paddle Sandbox · Тестовые платежи</p>
        <h1 className="text-4xl font-bold">Выберите тариф</h1><p>7 дней бесплатно, затем выбранная подписка. Автоматическое продление до отмены.</p>
        <p className="text-sm">Тестовые тарифы не изменяют полный доступ в основном приложении.</p></header>
      <div className="flex justify-center gap-3" role="group" aria-label="Период оплаты">
        {(['month', 'year'] as const).map(value => <button key={value} aria-pressed={frequency === value}
          onClick={() => setFrequency(value)} className={`rounded-full px-6 py-3 ${frequency === value ? 'bg-slate-900 text-white' : 'bg-white'}`}>
          {value === 'month' ? 'Ежемесячно' : 'Ежегодно'}</button>)}
      </div>
      {native && <p role="alert">Откройте эту страницу в браузере для тестирования Sandbox.</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      {offer?.config.country && <label className="block text-center text-sm">Почтовый индекс платёжного адреса ({offer.config.country})
        <input value={postalCode} onChange={event => setPostalCode(event.target.value)} autoComplete="postal-code"
          className="mx-auto mt-2 block rounded-lg border p-2" />
      </label>}
      <div className="grid gap-5 md:grid-cols-3">{subscriptionTiers.map(tier => {
        const priceId = tier.priceId[frequency];
        return <article key={tier.name} className="space-y-5 rounded-3xl border bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-bold">{tier.name}</h2><p>{tier.description}</p>
          <p className="text-3xl font-bold" aria-live="polite">{offer?.totals[priceId] ?? '…'}<span className="text-sm font-normal"> / {frequency === 'month' ? 'месяц' : 'год'}</span></p>
          <ul className="space-y-2">{tier.features.map(feature => <li key={feature}>✓ {feature}</li>)}</ul>
          <button disabled={!offer?.totals[priceId] || opening || loading || !user || isDemo || native || Boolean(offer.config.country && !postalCode.trim())}
            onClick={() => void subscribe(priceId)} className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white disabled:opacity-40">Подписаться</button>
        </article>;
      })}</div>
      {(!user || isDemo) && <p className="text-center"><a href="/auth" className="underline">Войдите в аккаунт родителя</a> для тестовой подписки.</p>}
      <p className="text-center text-sm">Цены и налоги рассчитывает Paddle для вашего местоположения. Итог при изменении платёжного адреса уточняется в Checkout.</p>
    </div>
  </main>;
}
