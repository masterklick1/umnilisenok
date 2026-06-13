import { useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logChildActivity } from "@/lib/activity-log";

export const useActivityTracker = () => {
  const { user } = useAuth();
  const location = useLocation();

  const logActivity = useCallback(
    async (activityType: string, details?: Record<string, unknown>) => {
      await logChildActivity(user?.id, activityType, location.pathname, details ?? null);
    },
    [user?.id, location.pathname],
  );

  useEffect(() => {
    logActivity("page_view", { path: location.pathname });
  }, [location.pathname, logActivity]);

  return {
    logCorrectAnswer: (details?: Record<string, unknown>) =>
      logActivity("answer_correct", details),
    logWrongAnswer: (details?: Record<string, unknown>) =>
      logActivity("answer_wrong", details),
    logClick: (element: string) => logActivity("click", { element }),
    logActivity,
  };
};
