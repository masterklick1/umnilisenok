import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Постоянный код ребёнка.
 * Если код уже был использован (аккаунт ребёнка создан) — выдаём одноразовый
 * token_hash для входа в ТОТ ЖЕ аккаунт. Это позволяет ребёнку заново войти
 * после переустановки приложения, не создавая новый аккаунт.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.trim().length !== 6) {
      return json({ error: "Неверный код" }, 400);
    }
    const normalized = code.trim().toUpperCase();

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    const { data: invite, error } = await admin
      .from("child_invites")
      .select("child_id, child_first_name")
      .eq("code", normalized)
      .maybeSingle();

    if (error) throw error;
    if (!invite) return json({ error: "Код не найден" }, 404);

    // Код ещё не использован — пусть клиент создаёт новый детский аккаунт.
    if (!invite.child_id) {
      return json({ status: "new", childName: invite.child_first_name });
    }

    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(invite.child_id);
    if (userErr || !userRes?.user?.email) {
      return json({ error: "Аккаунт ребёнка не найден" }, 404);
    }

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userRes.user.email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      return json({ error: linkErr?.message ?? "Не удалось войти" }, 500);
    }

    return json({
      status: "existing",
      childId: invite.child_id,
      childName: invite.child_first_name,
      email: userRes.user.email,
      tokenHash: link.properties.hashed_token,
    });
  } catch (e) {
    console.error("child-code-login error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
