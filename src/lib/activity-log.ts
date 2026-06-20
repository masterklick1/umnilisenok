import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { isDemoUserId } from "@/lib/demo-session";

/** Child id for activity: invite/child session, or logged-in child account. */
export const getActivityChildId = (authUserId: string | undefined): string | null => {
  if (!authUserId) return null;

  const activeChildId = sessionStorage.getItem("activeChildId");
  if (activeChildId) return activeChildId;

  return authUserId;
};

export const logChildActivity = async (
  authUserId: string | undefined,
  activityType: string,
  pagePath: string | null,
  details?: Record<string, unknown> | null,
): Promise<void> => {
  const childId = getActivityChildId(authUserId);
  if (!childId) return;
  if (isDemoUserId(childId)) return;

  const payload = {
    p_child_id: childId,
    p_activity_type: activityType,
    p_page_path: pagePath,
    p_details: (details ?? null) as Json,
  };

  const { error: rpcError } = await supabase.rpc("log_child_activity", payload);

  if (!rpcError) return;

  // Fallback when migration not applied yet — works for child on own phone
  if (rpcError.code === "PGRST202" || rpcError.message?.includes("log_child_activity")) {
    if (childId !== authUserId) return;

    const { error: insertError } = await supabase.from("child_activity").insert([
      {
        child_id: childId,
        activity_type: activityType,
        page_path: pagePath,
        details: (details ?? null) as Json,
      },
    ]);

    if (insertError) {
      console.error("Activity logging error:", insertError.message);
    }
    return;
  }

  console.error("Activity logging error:", rpcError.message);
};
