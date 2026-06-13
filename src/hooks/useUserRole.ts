import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "parent" | "child" | null;

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
    setLoading(true);

    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        const r = data?.role;
        setRole(r === "parent" || r === "child" ? r : null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return {
    role,
    loading,
    isParent: role === "parent",
    isChild: role === "child",
  };
}
