import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Позволяет РОДИТЕЛЮ удалить аккаунт ребёнка, который привязан к нему в
 * parent_child_links. Полностью удаляет все данные ребёнка и сам аккаунт
 * (auth-пользователя). Ничего не удаляет, если запрашивающий не является
 * привязанным родителем этого ребёнка — это проверяется явно перед удалением.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { childId } = await req.json();
    if (!childId || typeof childId !== "string") {
      return new Response(JSON.stringify({ error: "childId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parentId = userData.user.id;
    const admin = createClient(url, service);

    // Критичная проверка: удалять можно только СВОЕГО привязанного ребёнка.
    const { data: link, error: linkErr } = await admin
      .from("parent_child_links")
      .select("child_id")
      .eq("parent_id", parentId)
      .eq("child_id", childId)
      .maybeSingle();

    if (linkErr) throw linkErr;
    if (!link) {
      return new Response(JSON.stringify({ error: "Этот ребёнок не привязан к вашему аккаунту" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Удаляем данные ребёнка, не покрытые ON DELETE CASCADE.
    const childIdTables = [
      "child_activity",
      "child_locations",
      "backup_child_locations",
      "geofence_events",
      "sos_alerts",
      "child_saved_places",
      "child_settings",
      "child_analysis",
      "reading_progress",
    ];
    const userIdTables = ["push_subscriptions", "gallery_items", "user_room_items", "user_pets", "user_achievements", "user_progress"];

    for (const t of childIdTables) {
      await admin.from(t).delete().eq("child_id", childId);
    }
    for (const t of userIdTables) {
      await admin.from(t).delete().eq("user_id", childId);
    }

    await admin.from("monitoring_requests").delete().or(`parent_id.eq.${childId},child_id.eq.${childId}`);
    await admin.from("game_sessions").delete().or(`parent_id.eq.${childId},child_id.eq.${childId}`);
    await admin.from("parent_child_links").delete().or(`parent_id.eq.${childId},child_id.eq.${childId}`);
    await admin.from("child_invites").delete().or(`parent_id.eq.${childId},child_id.eq.${childId}`);
    await admin.from("profiles").delete().eq("id", childId);

    const { error: delErr } = await admin.auth.admin.deleteUser(childId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-child-account error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
