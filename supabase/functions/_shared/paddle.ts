import { Environment, Paddle } from "npm:@paddle/paddle-node-sdk@3.12.0";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

export function paddleConfig() {
  const environment = requiredEnv("PADDLE_ENVIRONMENT");
  if (environment !== "live" && environment !== "sandbox") {
    throw new Error("PADDLE_ENVIRONMENT must be live or sandbox");
  }
  const priceId = requiredEnv("PADDLE_FULL_ACCESS_PRICE_ID");
  if (!/^pri_[a-z0-9]{26}$/.test(priceId)) throw new Error("Invalid full-access price ID");
  return { environment, priceId } as const;
}

export function paddleClient(environment: "live" | "sandbox") {
  return new Paddle(requiredEnv("PADDLE_API_KEY"), {
    environment: environment === "live" ? Environment.production : Environment.sandbox,
  });
}

export function billingDatabase() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function hasFullAccess(
  database: ReturnType<typeof billingDatabase>,
  config: ReturnType<typeof paddleConfig>,
  customerId: string,
): Promise<boolean> {
  const { data, error } = await database.from("paddle_purchases").select("transaction_id")
    .eq("environment", config.environment).eq("customer_id", customerId)
    .eq("price_id", config.priceId).not("completed_at", "is", null).limit(1);
  if (error) throw error;
  return data.length > 0;
}
