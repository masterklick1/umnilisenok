// Sends Web Push to child device — e.g. when parent asks "Где сейчас?"

import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VAPID_PUBLIC =
  Deno.env.get("VAPID_PUBLIC_KEY") ??
  "BCp-2vIxJ4Rbjk0Zk-1cPN6OCw5O1XFPKmrkVbA7X6nm5lk1Dum59dpnQUt1d6MUPFB0YuN4WvkJuBfTaNIx5Q8";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@umnilisenok.app";

let vapidConfigured = false;

const ensureVapid = () => {
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("VAPID_PRIVATE_KEY is not configured");
  }
  if (!vapidConfigured) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, privateKey);
    vapidConfigured = true;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const childId: string = body.child_id;
    const pokeType: string = body.type ?? "location";

    if (!childId) {
      return new Response(JSON.stringify({ error: "missing child_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: link } = await admin
      .from("parent_child_links")
      .select("id")
      .eq("parent_id", user.id)
      .eq("child_id", childId)
      .maybeSingle();

    if (!link) {
      return new Response(JSON.stringify({ error: "not linked" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", childId);

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    ensureVapid();

    const title =
      pokeType === "location"
        ? "📍 Мама/папа спрашивает где ты"
        : "🦊 Открой приложение";
    const bodyText =
      pokeType === "location"
        ? "Нажми — отправим местоположение родителям"
        : "Родители ждут ответа";

    const payload = JSON.stringify({
      title,
      body: bodyText,
      tag: `child-poke-${childId}`,
      requireInteraction: true,
      url: "/",
    });

    let sent = 0;
    const expired: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent++;
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) expired.push(s.id);
          else console.error("child poke push error", status, err?.body);
        }
      }),
    );

    if (expired.length) {
      await admin.from("push_subscriptions").delete().in("id", expired);
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
