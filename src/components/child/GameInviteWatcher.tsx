import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Gamepad2, X } from "lucide-react";

const GAME_NAMES: Record<string, string> = {
  tic_tac_toe: "Крестики-нолики",
  checkers: "Шашки",
  chess: "Шахматы",
};

interface PendingGame {
  id: string;
  game_type: string;
}

/**
 * Shows a persistent invite banner on the child's device whenever a parent
 * has an active game session waiting. Works on every screen, uses realtime
 * plus polling so an invite is never missed.
 */
export function GameInviteWatcher() {
  const { user } = useAuth();
  const { isChild } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [game, setGame] = useState<PendingGame | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("game_sessions")
      .select("id, game_type, status")
      .eq("child_id", user.id)
      .in("status", ["active", "waiting"])
      .order("created_at", { ascending: false })
      .limit(1);

    const row = data?.[0];
    setGame(row ? { id: row.id, game_type: row.game_type } : null);
  }, [user?.id]);

  useEffect(() => {
    if (!isChild || !user?.id) {
      setGame(null);
      return;
    }

    load();

    const channel = supabase
      .channel(`game-invites-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `child_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    const poll = window.setInterval(load, 15_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
    };
  }, [isChild, user?.id, load]);

  if (!isChild || !game) return null;
  if (location.pathname.startsWith("/games/")) return null;
  if (dismissed.includes(game.id)) return null;

  return (
    <div className="fixed top-3 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-card/95 p-3 shadow-xl backdrop-blur">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Gamepad2 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">Тебя зовут играть! 🎮</p>
          <p className="truncate text-xs text-muted-foreground">
            {GAME_NAMES[game.game_type] || "Игра"}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate(`/games/${game.id}`)}>
          Играть
        </Button>
        <button
          aria-label="Скрыть"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed((d) => [...d, game.id])}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
