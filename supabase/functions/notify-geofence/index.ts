// Sends Web Push notifications to parents when a child crosses a geofence.
// Called from the child's app right after inserting into geofence_events.

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
// Fallback for environments where secrets can't be configured (e.g. Lovable without Cloud)
const VAPID_PRIVATE_FALLBACK = "kQgRUcwvUipDz1rFMsOVuc_-v2LNDzAsuFC7XGYRNtQ";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@umnilisenok.app";

let vapidConfigured = false;

const ensureVapid = () => {
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? VAPID_PRIVATE_FALLBACK;
  if (!vapidConfigured) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, privateKey);
    vapidConfigured = true;
  }
  return true;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller (child) identity
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const eventType: "exit" | "enter" = body.event_type;
    const distanceM: number | null = body.distance_m ?? null;

    const admin = createClient(supabaseUrl, serviceKey);

    // Get child name
    const { data: profile } = await admin
      .from("profiles")
      .select("first_name")
      .eq("id", user.id)
      .maybeSingle();
    const childName = profile?.first_name || "Ребёнок";

    // Find parents linked to this child
    const { data: links } = await admin
      .from("parent_child_links")
      .select("parent_id")
      .eq("child_id", user.id);

    const parentIds = (links ?? []).map((l) => l.parent_id);
    if (parentIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch parents' push subscriptions
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", parentIds);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const placeName: string | null = body.place_name ?? null;
    const statusMessage: string | null = body.status_message ?? null;
    const statusHint: string | null = body.status_hint ?? null;

    ensureVapid();

    let title: string;
    let body_: string;

    if (placeName) {
      if (eventType === "enter") {
        title = `✅ ${childName} в ${placeName}`;
      } else if (statusHint === "going_home" || statusMessage?.includes("домой")) {
        title = `🏠 ${childName} идёт домой`;
      } else {
        title = `⚠️ ${childName} вышел из «${placeName}»`;
      }
      body_ = statusMessage || (distanceM != null ? `${Math.round(distanceM)} м от центра` : "");
    } else {
      title =
        eventType === "exit"
          ? `⚠️ ${childName} вышел из безопасной зоны`
          : `✅ ${childName} вернулся в зону`;
      body_ = distanceM != null ? `Расстояние от центра: ${Math.round(distanceM)} м` : "";
    }

    const payload = JSON.stringify({
      title,
      body: body_,
      tag: `geofence-${user.id}`,
      requireInteraction: eventType === "exit",
      url: "/parent",
    });

    let sent = 0;
    const expired: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) expired.push(s.id);
          else console.error("push error", status, err?.body);
        }
      })
    );

    if (expired.length) {
      await admin.from("push_subscriptions").delete().in("id", expired);
    }

    return new Response(JSON.stringify({ sent, expired: expired.length }), {
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
