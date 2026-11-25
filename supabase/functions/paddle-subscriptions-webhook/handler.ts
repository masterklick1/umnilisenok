import { EventName, type Webhooks } from 'npm:@paddle/paddle-node-sdk@3.12.0';
import { billingDatabase, requiredEnv } from '../_shared/paddle.ts';
import { subscriptionConfig, subscriptionPaddle } from '../_shared/subscription-server.ts';
import { tierForPrice } from '../_shared/subscription-catalog.ts';

export async function handleSubscriptionWebhook(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const signature = request.headers.get('Paddle-Signature');
  if (!signature) return new Response(null, { status: 400 });
  let paddle: ReturnType<typeof subscriptionPaddle>;
  let secret: string;
  try {
    paddle = subscriptionPaddle();
    secret = requiredEnv('PADDLE_SANDBOX_WEBHOOK_SECRET');
  } catch { return new Response(null, { status: 503 }); }

  let event: Awaited<ReturnType<Webhooks['unmarshal']>>;
  try {
    // Signature verification precedes all database reads/writes and API calls.
    event = await paddle.webhooks.unmarshal(await request.text(), secret, signature);
  } catch { return new Response(null, { status: 400 }); }

  const environment = subscriptionConfig().environment;
  const database = billingDatabase();
  const saveCustomer = async (customer: { id: string; email: string; updatedAt: string }) => {
    const { error } = await database.rpc('record_paddle_customer', {
      p_environment: environment, p_customer_id: customer.id,
      p_email: customer.email, p_updated_at: customer.updatedAt,
    });
    if (error) throw error;
  };
  const ensureCustomer = async (id: string) => {
    const { data, error } = await database.from('paddle_customers').select('customer_id')
      .eq('environment', environment).eq('customer_id', id).maybeSingle();
    if (error) throw error;
    // Handles subscription/transaction notifications arriving before customer.created.
    if (!data) await saveCustomer(await paddle.customers.get(id));
  };
  try {
    switch (event.eventType) {
      case EventName.CustomerCreated:
      case EventName.CustomerUpdated:
        await saveCustomer(event.data);
        break;
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionCanceled:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionPaused:
      case EventName.SubscriptionResumed:
      case EventName.SubscriptionPastDue: {
        const sub = event.data;
        await ensureCustomer(sub.customerId);
        // Unexpected/multi-item subscriptions are mirrored but cannot grant a tier.
        const item = sub.items.length === 1 && sub.items[0].quantity === 1 ? sub.items[0] : undefined;
        const { error } = await database.rpc('record_paddle_subscription', {
          p_environment: environment, p_event_at: event.occurredAt,
          p_data: { id: sub.id, customerId: sub.customerId, status: sub.status,
            priceId: item?.price?.id ?? '', productId: item?.price?.productId ?? '', items: sub.items,
            scheduledChangeAction: sub.scheduledChange?.action ?? null,
            scheduledChangeAt: sub.scheduledChange?.effectiveAt ?? null, createdAt: sub.createdAt },
        });
        if (error) throw error;
        break;
      }
      case EventName.TransactionCompleted: {
        const transaction = event.data;
        if (!transaction.customerId || !transaction.items.some(item => item.price && tierForPrice(item.price.id))) break;
        await ensureCustomer(transaction.customerId);
        const { error } = await database.rpc('record_paddle_subscription_transaction', {
          p_environment: environment, p_event_at: event.occurredAt,
          p_data: { id: transaction.id, customerId: transaction.customerId,
            subscriptionId: transaction.subscriptionId, status: transaction.status, items: transaction.items },
        });
        if (error) throw error;
        break;
      }
      default: break;
    }
    console.info('Sandbox Paddle processed', event.eventId, event.eventType);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Sandbox Paddle processing failed', event.eventId, event.eventType,
      error instanceof Error ? error.message : 'database operation failed');
    return new Response(null, { status: 500 });
  }
}
