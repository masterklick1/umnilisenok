import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionRequest, type SubscriptionStatus } from '@/lib/paddle-subscriptions';

export default function SandboxBillingPage() {
  const { user, loading, isDemo } = useAuth();
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  const state = useQuery({
    queryKey: ['sandbox-subscription', user?.id], enabled: Boolean(user && !isDemo),
    queryFn: () => subscriptionRequest<SubscriptionStatus>('status'),
    refetchInterval: 3000, retry: false,
  });
  async function portal() {
    setOpening(true); setError('');
    try {
      const { url } = await subscriptionRequest<{ url: string }>('portal');
      const destination = new URL(url);
      if (destination.protocol !== 'https:' || !destination.hostname.endsWith('.paddle.com')) throw new Error('Unexpected portal URL');
      window.location.assign(destination.href);
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось открыть кабинет'); setOpening(false); }
  }
  return <main className="mx-auto max-w-2xl space-y-6 px-6 py-12">
    <a href="/sandbox/pricing">← Тестовые тарифы</a><h1 className="text-3xl font-bold">Подписка Sandbox</h1>
    <p>Статус доступа подтверждается сервером после обработки webhook. Возврат из Checkout сам по себе не выдаёт доступ.</p>
    {loading || state.isFetching && !state.data ? <p>Проверяем статус…</p> : null}
    {(!user || isDemo) && <a href="/auth">Войдите в аккаунт родителя</a>}
    {(state.error || error) && <p role="alert">{error || state.error?.message}</p>}
    {state.data && <>
      <p className="text-xl">{state.data.paid ? `Тестовый доступ активен: ${state.data.tier}` : 'Активной тестовой подписки нет'}</p>
      {state.data.subscriptions.map(sub => <div key={sub.subscription_id} className="rounded-xl border p-4">
        <p>{sub.status}</p>{sub.scheduled_change_action && <p>Запланировано: {sub.scheduled_change_action} · {sub.scheduled_change_at}</p>}
      </div>)}
      <button onClick={() => void portal()} disabled={opening} className="rounded-xl bg-slate-900 px-5 py-3 text-white disabled:opacity-40">Управлять подпиской и счетами</button>
    </>}
  </main>;
}
