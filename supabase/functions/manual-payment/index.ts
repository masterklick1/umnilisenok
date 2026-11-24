// Manual QR/card transfer payments: parent taps "I paid" -> Telegram message with approve link.
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { paymentStatus } from "../_shared/manual-payment-status.mjs";

const cors = corsHeaders;
const json = (v: object, status = 200) =>
  Response.json(v, { status, headers: { ...cors, "Cache-Control": "no-store" } });
const html = (msg: string, form = "", status = 200) =>
  new Response(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Умный лисёнок — подтверждение оплаты</title></head><body style="font-family:sans-serif;padding:32px;text-align:center"><h2>${msg}</h2>${form}</body></html>`,
    { status, headers: { ...cors, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'" } });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) throw new Error("Missing payment configuration");
const admin = createClient(url, key);
const approvalSchema = z.object({ id: z.string().uuid(), token: z.string().regex(/^[0-9a-f]{48}$/) });
const actionSchema = z.object({ action: z.enum(["status", "request"]) });

async function telegram(text: string, buttonUrl?: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chat = Deno.env.get("TELEGRAM_FEEDBACK_CHAT_ID");
  if (!token || !chat) return false;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat, text, parse_mode: "HTML",
      ...(buttonUrl ? { reply_markup: { inline_keyboard: [[{ text: "✅ Активировать доступ", url: buttonUrl }]] } } : {}),
    }),
  });
  const b = await r.json().catch(() => null);
  if (!b?.ok) console.error("telegram failed", r.status);
  return !!b?.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    const isApprovalPost = req.method === "POST" && req.headers.get("content-type")?.includes("application/x-www-form-urlencoded");
    if (req.method === "GET" || isApprovalPost) {
      const p = isApprovalPost ? await req.formData() : new URL(req.url).searchParams;
      const parsed = approvalSchema.safeParse({ id: p.get("id"), token: p.get("token") });
      if (!parsed.success) return html("Неверная ссылка", "", 400);
      const { id, token } = parsed.data;
      const { data: row, error } = await admin.from("manual_payments").select("id,status,email,amount")
        .eq("id", id).eq("approve_token", token).maybeSingle();
      if (error) throw error;
      if (!row) return html("Заявка не найдена", "", 404);
      if (row.status === "approved") return html("✅ Доступ уже активирован");
      if (row.status !== "pending") return html("Эта заявка не ожидает подтверждения", "", 409);
      if (!isApprovalPost) return html(`Подтвердить перевод ${esc(row.amount)} от ${esc(row.email ?? "—")}?`,
        `<p>Нажимайте только после проверки поступления денег.</p><form method="post"><input type="hidden" name="id" value="${id}"><input type="hidden" name="token" value="${token}"><button type="submit" style="padding:16px;font-size:18px">✅ Деньги получены — активировать доступ</button></form>`);
      const { data: updated, error: updateError } = await admin.from("manual_payments")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", id).eq("approve_token", token).eq("status", "pending").select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return html("✅ Доступ уже активирован");
      await telegram(`✅ Полный доступ активирован для ${esc(row.email ?? "—")}`).catch(() => false);
      return html(`✅ Полный доступ активирован для ${esc(row.email ?? "")}`);
    }
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    const jwt = req.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!jwt) return json({ error: "unauthorized" }, 401);
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: "unauthorized" }, 401);

    const parsed = actionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "unknown_action" }, 400);
    const { action } = parsed.data;
    const { data: rows, error: statusError } = await admin.from("manual_payments").select("id,status,created_at,approved_at,email,amount")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    if (statusError) throw statusError;
    const status = paymentStatus(rows ?? []);
    if (action === "status" || status.approved || status.pending) return json(status);

    const { data: profile } = await admin.from("profiles").select("first_name,role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "parent") return json({ error: "parent_account_required" }, 403);
    const { data: row, error } = await admin.from("manual_payments")
      .insert({ user_id: user.id, email: user.email }).select("id,approve_token").single();
    if (error) throw error;
    const link = `${url}/functions/v1/manual-payment?id=${row.id}&token=${row.approve_token}`;
    const delivered = await telegram(
      `💳 <b>Новая оплата «Полного доступа» (10 TJS)</b>\n\n` +
      `👤 <b>Имя:</b> ${esc(profile?.first_name ?? "—")}\n📧 <b>Почта:</b> ${esc(user.email ?? "—")}\n` +
      `🆔 Аккаунт привязан автоматически\n\nПроверьте поступление в Dushanbe City и нажмите кнопку.`,
      link,
    ).catch(() => false);
    if (!delivered) {
      await admin.from("manual_payments").delete().eq("id", row.id).eq("status", "pending");
      return json({ error: "notification_failed" }, 503);
    }
    return json({ approved: false, pending: true });
  } catch (e) {
    console.error("manual-payment error", e);
    return json({ error: "unexpected" }, 500);
  }
});
