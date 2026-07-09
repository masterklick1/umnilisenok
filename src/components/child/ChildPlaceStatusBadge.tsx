import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { fetchPlaceStatus, type ChildPlaceStatusRow } from "@/lib/child-places-service";

/** Shows child's current place status on their phone. */
export function ChildPlaceStatusBadge() {
  const { user } = useAuth();
  const { isChild } = useUserRole();
  const [status, setStatus] = useState<ChildPlaceStatusRow | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!isChild || !user?.id) return;

    const load = () => fetchPlaceStatus(user.id).then(setStatus);
    load();

    const ch = supabase
      .channel(`child-status-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "child_place_status", filter: `child_id=eq.${user.id}` },
        (payload) => setStatus(payload.new as ChildPlaceStatusRow),
      )
      .subscribe();

    const onLocal = (e: Event) => {
      const msg = (e as CustomEvent<{ message: string }>).detail.message;
      setBanner(msg);
      window.setTimeout(() => setBanner(null), 8000);
    };
    window.addEventListener("child-place-status", onLocal);

    const poll = window.setInterval(load, 20_000);

    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("child-place-status", onLocal);
      window.clearInterval(poll);
    };
  }, [isChild, user?.id]);

  if (!isChild) return null;

  const text = banner || status?.status_message;
  if (!text) return null;

  return (
    <div className="fixed top-3 left-3 right-3 z-40 flex justify-center pointer-events-none">
      <div className="rounded-full border border-primary/20 bg-card/95 backdrop-blur px-4 py-2 shadow-md text-sm font-medium max-w-md text-center">
        {text}
      </div>
    </div>
  );
}
