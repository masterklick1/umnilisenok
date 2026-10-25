// Saves parent feedback and forwards it instantly to the author's Telegram.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CATEGORY_LABELS: Record<string, string> = {
  idea: "💡 Идея или пожелание",
  bug: "🐞 Ошибка",
  question: "❓ Вопрос",
  other: "💬 Другое",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

    const body = await req.json().catch(() => ({}));
    const rawMessage = typeof body?.message === "string" ? body.message.trim() : "";
    const category =
      typeof body?.category === "string" && CATEGORY_LABELS[body.category] ? body.category : "other";
    const appVersion = typeof body?.app_version === "string" ? body.app_version.slice(0, 40) : null;

    if (rawMessage.length < 3 || rawMessage.length > 2000) {
      return new Response(JSON.stringify({ error: "invalid_message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const message = rawMessage.slice(0, 2000);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const { error: insertError } = await admin.from("parent_feedback").insert({
      user_id: user.id,
      category,
      message,
      contact_email: user.email ?? profile?.email ?? null,
      app_version: appVersion,
    });

    if (insertError) {
      console.error("feedback insert failed:", insertError.message);
      return new Response(JSON.stringify({ error: "save_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward to Telegram (best effort — feedback is already saved).
    let delivered = false;
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_FEEDBACK_CHAT_ID");
    if (token && chatId) {
      const text =
        `📩 <b>Новый отзыв от родителя</b>\n\n` +
        `<b>Тема:</b> ${escapeHtml(CATEGORY_LABELS[category])}\n` +
        `<b>Имя:</b> ${escapeHtml(profile?.first_name ?? "—")}\n` +
        `<b>Почта:</b> ${escapeHtml(user.email ?? profile?.email ?? "—")}\n` +
        (appVersion ? `<b>Версия:</b> ${escapeHtml(appVersion)}\n` : "") +
        `\n${escapeHtml(message)}`;

      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      });
      const tgBody = await tgRes.json().catch(() => null);
      delivered = !!tgBody?.ok;
      if (!delivered) {
        console.error("telegram send failed:", tgRes.status, JSON.stringify(tgBody));
      }
    } else {
      console.warn("Telegram not configured: missing bot token or chat id");
    }

    return new Response(JSON.stringify({ ok: true, delivered }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-parent-feedback error:", e);
    return new Response(JSON.stringify({ error: "unexpected" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
