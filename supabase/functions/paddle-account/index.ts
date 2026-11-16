import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import { billingDatabase, hasFullAccess, paddleClient, paddleConfig, requiredEnv } from "../_shared/paddle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(value: object, status = 200) {
  return Response.json(value, { status, headers: { ...corsHeaders, "Cache-Control": "no-store" } });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "method_not_allowed" }, 405);

  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return respond({ error: "unauthorized" }, 401);

  try {
    const auth = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError || !user?.email || user.is_anonymous) return respond({ error: "unauthorized" }, 401);

    const action = new URL(request.url).searchParams.get("action");
    if (action !== "status" && action !== "checkout" && action !== "portal") {
      return respond({ error: "unknown_action" }, 400);
    }

    const database = billingDatabase();
    const { data: profile, error: profileError } = await database.from("profiles").select("role")
      .eq("id", user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== "parent") return respond({ error: "parent_account_required" }, 403);

    const config = paddleConfig();
    const { data: owner, error: ownerError } = await database.from("paddle_customers")
      .select("customer_id").eq("environment", config.environment).eq("user_id", user.id).maybeSingle();
    if (ownerError) throw ownerError;
    const paid = owner ? await hasFullAccess(database, config, owner.customer_id) : false;

    if (action === "status") return respond({ paid });
    if (action === "portal") {
      if (!owner || !paid) return respond({ error: "purchase_required" }, 404);
      const paddle = paddleClient(config.environment);
      const session = await paddle.customerPortalSessions.create(owner.customer_id);
      return respond({ url: session.urls.general.overview });
    }

    if (paid) return respond({ error: "already_purchased" }, 409);
    const paddle = paddleClient(config.environment);
    let customerId = owner?.customer_id;

    if (!customerId) {
      // An email match alone must never grant access to an existing Paddle customer's portal.
      const customer = await paddle.customers.create({ email: user.email });
      customerId = customer.id;
      const { error } = await database.rpc("record_paddle_customer", {
        p_environment: config.environment, p_customer_id: customerId,
        p_email: customer.email, p_updated_at: customer.updatedAt, p_user_id: user.id,
      });
      if (error) throw error;
    }

    const transaction = await paddle.transactions.create({
      customerId,
      items: [{ priceId: config.priceId, quantity: 1 }],
    });
    const { error: purchaseError } = await database.from("paddle_purchases").insert({
      environment: config.environment,
      transaction_id: transaction.id,
      customer_id: customerId,
      price_id: config.priceId,
    });
    if (purchaseError) throw purchaseError;
    return respond({ transactionId: transaction.id, priceId: config.priceId });
  } catch (error) {
    console.error("Paddle account request failed", error instanceof Error ? error.name : "request error");
    return respond({ error: "billing_unavailable" }, 503);
  }
});
