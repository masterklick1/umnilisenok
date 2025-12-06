import { useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useActivityTracker = () => {
  const { user } = useAuth();
  const location = useLocation();

  const logActivity = useCallback(
    async (
      activityType: string,
      details?: Record<string, unknown>
    ) => {
      if (!user?.id) return;

      try {
        await supabase.from("child_activity").insert([{
          child_id: user.id,
          activity_type: activityType,
          page_path: location.pathname,
          details: details as unknown as Record<string, unknown> || null,
        }]);
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.error("Activity logging error:", error);
      }
    },
    [user?.id, location.pathname]
  );

  // Log page views
  useEffect(() => {
    logActivity("page_view", { path: location.pathname });
  }, [location.pathname, logActivity]);

  return {
    logCorrectAnswer: (details?: Record<string, unknown>) =>
      logActivity("answer_correct", details),
    logWrongAnswer: (details?: Record<string, unknown>) =>
      logActivity("answer_wrong", details),
    logClick: (element: string) =>
      logActivity("click", { element }),
    logActivity,
  };
};
