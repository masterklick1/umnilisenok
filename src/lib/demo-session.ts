import type { User } from "@supabase/supabase-js";

export const DEMO_SESSION_KEY = "umnilisenok_demo_session";
export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_CHILD_NAME = "Демо";
export const DEMO_PLAN = "demo_preview";

export const demoProgress = {
  id: "demo-progress",
  user_id: DEMO_USER_ID,
  stars: 0,
  level: 1,
  experience: 0,
  daily_streak: 0,
  last_activity_date: null,
};

export const isDemoSessionActive = () =>
  window.localStorage.getItem(DEMO_SESSION_KEY) === "active";

export const startDemoSession = () => {
  window.localStorage.setItem(DEMO_SESSION_KEY, "active");
  window.sessionStorage.setItem("activeChildId", DEMO_USER_ID);
  window.sessionStorage.setItem("activeChildName", DEMO_CHILD_NAME);
};

export const clearDemoSession = () => {
  window.localStorage.removeItem(DEMO_SESSION_KEY);
  if (window.sessionStorage.getItem("activeChildId") === DEMO_USER_ID) {
    window.sessionStorage.removeItem("activeChildId");
    window.sessionStorage.removeItem("activeChildName");
  }
};

export const isDemoUserId = (userId: string | undefined | null) => userId === DEMO_USER_ID;

export const isDemoUser = (user: User | null | undefined) =>
  isDemoUserId(user?.id) || user?.user_metadata?.app_mode === "demo";

export const createDemoUser = () =>
  ({
    id: DEMO_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "demo@umnilisenok.local",
    app_metadata: {},
    user_metadata: {
      role: "child",
      first_name: DEMO_CHILD_NAME,
      app_mode: "demo",
      subscription_plan: DEMO_PLAN,
    },
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  }) as User;
