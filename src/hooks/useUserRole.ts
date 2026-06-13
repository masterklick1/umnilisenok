import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { resolveUserRole, type ResolvedRole } from "@/lib/resolve-user-role";

export type UserRole = ResolvedRole;

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const r = await resolveUserRole(user);
      if (!cancelled) {
        setRole(r);
        setLoading(false);
      }
    };

    load();
    const interval = window.setInterval(load, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user]);

  return {
    role,
    loading,
    isParent: role === "parent",
    isChild: role === "child",
  };
}
