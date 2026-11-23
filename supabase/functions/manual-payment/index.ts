// Manual QR/card transfer payments: parent taps "I paid" -> Telegram message with approve link.
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (v: object, status = 200) =>
  Response.json(v, { status, headers: { ...cors, "Cache-Control": "no-store" } });
const html = (msg: string) =>
  new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>${msg}</h2></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const url = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
  if (!b?.ok) console.error("telegram failed", r.status, JSON.stringify(b));
  return !!b?.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    if (req.method === "GET") {
      const p = new URL(req.url).searchParams;
      const id = p.get("id") ?? "", token = p.get("token") ?? "";
      if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{48}$/.test(token)) return html("Неверная ссылка");
      const { data: row } = await admin.from("manual_payments").select("id,status,approve_token,email")
        .eq("id", id).maybeSingle();
      if (!row || row.approve_token !== token) return html("Заявка не найдена");
      if (row.status === "approved") return html("✅ Доступ уже активирован");
      await admin.from("manual_payments").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
      await telegram(`✅ Полный доступ активирован для ${esc(row.email ?? "—")}`);
      return html(`✅ Полный доступ активирован для ${esc(row.email ?? "")}`);
    }
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    const jwt = req.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    if (!jwt) return json({ error: "unauthorized" }, 401);
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const { data: rows } = await admin.from("manual_payments").select("id,status,created_at,approved_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
    const approved = rows?.some((r) => r.status === "approved") ?? false;
    const pending = rows?.some((r) => r.status === "pending") ?? false;
    const ok = rows?.find((r) => r.status === "approved");
    const receipt = ok ? { id: ok.id, approved_at: ok.approved_at, email: user.email, amount: "10.00 TJS" } : null;
    if (action === "status") return json({ approved, pending, receipt });
    if (action !== "request") return json({ error: "unknown_action" }, 400);
    if (approved) return json({ approved: true, pending: false });

    const { data: profile } = await admin.from("profiles").select("first_name,role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "parent") return json({ error: "parent_account_required" }, 403);
    const recent = rows?.find((r) => r.status === "pending" && Date.now() - new Date(r.created_at).getTime() < 10 * 60_000);
    if (recent) return json({ approved: false, pending: true });

    const { data: row, error } = await admin.from("manual_payments")
      .insert({ user_id: user.id, email: user.email }).select("id,approve_token").single();
    if (error) throw error;
    const link = `${url}/functions/v1/manual-payment?id=${row.id}&token=${row.approve_token}`;
    await telegram(
      `💳 <b>Новая оплата «Полного доступа» (10 TJS)</b>\n\n` +
      `👤 <b>Имя:</b> ${esc(profile?.first_name ?? "—")}\n📧 <b>Почта:</b> ${esc(user.email ?? "—")}\n` +
      `🆔 Аккаунт привязан автоматически\n\nПроверьте поступление в Dushanbe City и нажмите кнопку.`,
      link,
    );
    return json({ approved: false, pending: true });
  } catch (e) {
    console.error("manual-payment error", e);
    return json({ error: "unexpected" }, 500);
  }
});
