import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isDemoUser } from "@/lib/demo-session";

export type ResolvedRole = "parent" | "child" | null;

/** Profile role + metadata fallback; self-heal invite child accounts stuck as parent. */
export async function resolveUserRole(user: User): Promise<ResolvedRole> {
  if (isDemoUser(user)) return "child";

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const profileRole = data?.role;
  const metaRole = user.user_metadata?.role;

  if (profileRole === "child" || profileRole === "parent") {
    return profileRole;
  }

  if (metaRole === "child") {
    supabase.from("profiles").update({ role: "child" }).eq("id", user.id).then(() => {});
    return "child";
  }

  if (metaRole === "parent") {
    return "parent";
  }

  return profileRole === "child" || profileRole === "parent" ? profileRole : "parent";
}

export async function resolveChildTrackingId(user: User): Promise<string | null> {
  const role = await resolveUserRole(user);
  return role === "child" ? user.id : null;
}
