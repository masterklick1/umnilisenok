import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const userId = userData.user.id;
    const admin = createClient(url, service);

    // Remove app data that is not covered by ON DELETE CASCADE
    const tables = [
      "child_activity",
      "child_locations",
      "backup_child_locations",
      "geofence_events",
      "sos_alerts",
      "monitoring_requests",
      "child_saved_places",
      "child_settings",
      "push_subscriptions",
      "reading_progress",
      "child_analysis",
      "gallery_items",
      "user_room_items",
      "user_pets",
      "user_achievements",
      "user_progress",
    ];

    for (const t of tables) {
      const col = ["child_activity", "child_locations", "backup_child_locations", "geofence_events", "sos_alerts", "child_saved_places", "child_analysis", "reading_progress"].includes(t)
        ? "child_id"
        : t === "child_settings"
          ? "child_id"
          : "user_id";
      await admin.from(t).delete().eq(col, userId);
    }

    await admin.from("monitoring_requests").delete().or(`parent_id.eq.${userId},child_id.eq.${userId}`);
    await admin.from("game_sessions").delete().or(`parent_id.eq.${userId},child_id.eq.${userId}`);
    await admin.from("parent_child_links").delete().or(`parent_id.eq.${userId},child_id.eq.${userId}`);
    await admin.from("child_invites").delete().eq("parent_id", userId);
    await admin.from("profiles").delete().eq("id", userId);

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-account error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
