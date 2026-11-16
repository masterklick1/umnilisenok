import { EventName, type Webhooks } from "npm:@paddle/paddle-node-sdk@3.12.0";
import { billingDatabase, paddleClient, paddleConfig, requiredEnv } from "../_shared/paddle.ts";

async function handleWebhook(request: Request): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const signature = request.headers.get("Paddle-Signature");
  if (!signature) return new Response(null, { status: 400 });

  let secret: string;
  let paddle: ReturnType<typeof paddleClient>;
  let config: ReturnType<typeof paddleConfig>;
  try {
    secret = requiredEnv("PADDLE_WEBHOOK_SECRET");
    config = paddleConfig();
    paddle = paddleClient(config.environment);
  } catch {
    return new Response(null, { status: 503 });
  }

  let event: Awaited<ReturnType<Webhooks["unmarshal"]>>;
  try {
    event = await paddle.webhooks.unmarshal(await request.text(), secret, signature);
  } catch {
    return new Response(null, { status: 400 });
  }

  try {
    switch (event.eventType) {
      case EventName.CustomerCreated:
      case EventName.CustomerUpdated: {
        const { environment } = config;
        const { id, email, updatedAt } = event.data;
        const { error } = await billingDatabase().rpc("record_paddle_customer", {
          p_environment: environment,
          p_customer_id: id,
          p_email: email,
          p_updated_at: updatedAt,
        });
        if (error) throw error;
        break;
      }
      case EventName.TransactionCompleted: {
        const { environment, priceId } = config;
        const transaction = event.data;
        if (
          transaction.status !== "completed" || !transaction.customerId || transaction.subscriptionId ||
          transaction.items.length !== 1 || transaction.items[0].price?.id !== priceId ||
          transaction.items[0].quantity !== 1 || transaction.items[0].price.billingCycle
        ) break;

        // Only the server can record an eligible transaction before handing it to checkout.
        // Never create ownership from a webhook email or custom_data.
        const { error } = await billingDatabase().from("paddle_purchases")
          .update({ completed_at: event.occurredAt })
          .eq("environment", environment).eq("transaction_id", transaction.id)
          .eq("customer_id", transaction.customerId).eq("price_id", priceId)
          .is("completed_at", null);
        if (error) throw error;
        break;
      }
    }
    return new Response(null, { status: 200 });
  } catch {
    console.error("Paddle webhook processing failed", event.eventType, event.eventId);
    return new Response(null, { status: 500 });
  }
}

Deno.serve(handleWebhook);
